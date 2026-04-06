import {type FormEvent, useState} from 'react'
import Navbar from "../components/Navbar";
import FileUploader from "../components/FileUploader";
import {usePuterStore} from "../lib/puter";
import {useNavigate} from "react-router";
import {convertPdfToImage} from "../lib/pdf2img";
import {
    generateActionableRewrites,
    generateProjectBullets,
    generateUUID,
    getRoleKeywordAnalysis,
    parseFeedback,
    rewriteFeedbackForStudents,
} from "../lib/utils";
import {prepareInstructions} from "../../constants";

const Upload = () => {
    const { fs, ai, kv } = usePuterStore();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const handleFileSelect = (file: File | null) => {
        setFile(file)
    }

    const handleAnalyze = async ({ companyName, jobTitle, jobDescription, file }: { companyName: string, jobTitle: string, jobDescription: string, file: File  }) => {
        setIsProcessing(true);

        try {
            console.log('Starting analysis. file:', file, 'fs object:', fs, 'puter:', (window as any).puter);

            setStatusText('Uploading the file...');
            const uploadedFile = await Promise.race([
                fs.upload([file]),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Upload timeout')), 30000)
                )
            ]) as any;
            
            if(!uploadedFile || !uploadedFile.path) {
                console.error('fs.upload returned:', uploadedFile);
                throw new Error('Failed to upload file. Please check your connection and try again.');
            }

            setStatusText('Converting to image...');
            const imageFile = await convertPdfToImage(file);
            if(!imageFile.file) throw new Error(imageFile.error || 'Failed to convert PDF to image');

            setStatusText('Uploading the image...');
            const uploadedImage = await Promise.race([
                fs.upload([imageFile.file]),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Upload timeout')), 30000)
                )
            ]) as any;
            
            if(!uploadedImage || !uploadedImage.path) throw new Error('Failed to upload image. Please try again.');

            setStatusText('Preparing data...');
            const uuid = generateUUID();
            const createdAt = Date.now();
            const data: {
                id: string;
                resumePath: string;
                imagePath: string;
                companyName: string;
                jobTitle: string;
                jobDescription: string;
                feedback: Feedback | null;
                studentFeedback?: StudentFeedback;
                roleKeywordAnalysis?: RoleKeywordAnalysis;
                generatedProjectBullets?: string[];
                actionableRewrites?: ActionableRewrite[];
                usedFallbackAnalysis?: boolean;
                jobState: string;
                retryCount: number;
                createdAt: number;
                completedAt?: number;
            } = {
                id: uuid,
                resumePath: uploadedFile.path,
                imagePath: uploadedImage.path,
                companyName, jobTitle, jobDescription,
                feedback: null,
                jobState: 'queued',
                retryCount: 0,
                createdAt,
            }
            await kv.set(`resume:${uuid}`, JSON.stringify(data));

            setStatusText('Analyzing resume with AI (this may take 2-3 minutes)...');
            data.jobState = 'processing';
            await kv.set(`resume:${uuid}`, JSON.stringify(data));

            console.log('Starting AI feedback analysis...');
            console.log('Job Title:', jobTitle);
            console.log('Job Description length:', jobDescription.length);

            const feedbackTimeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Analysis timeout: exceeded 180 seconds (3 minutes). The AI service may be overloaded. Please try again in a moment or use a shorter job description.')), 180000)
            );

            const feedback = await Promise.race([
                ai.feedback(
                    uploadedFile.path,
                    prepareInstructions({ jobTitle, jobDescription })
                ),
                feedbackTimeout
            ]) as any;

            console.log('Raw AI response:', feedback);

            if (!feedback) {
                throw new Error('No response from AI analysis. Please try again.');
            }

            if (!feedback.message) {
                console.error('Invalid feedback structure:', feedback);
                throw new Error('Invalid AI response format. Please try again.');
            }

            const feedbackText = typeof feedback.message.content === 'string'
                ? feedback.message.content
                : Array.isArray(feedback.message.content) 
                    ? feedback.message.content[0]?.text
                    : '';

            console.log('Extracted feedback text:', feedbackText);

            if(!feedbackText) {
                console.error('No text content in feedback:', feedback);
                throw new Error('AI returned empty response. Please try again.');
            }

            // Parse and normalize the feedback
            console.log('Parsing feedback text...');
            const parsedFeedback = parseFeedback(feedbackText);
            console.log('Parsed feedback:', parsedFeedback);

            const usedFallbackAnalysis = feedback?.via_ai_chat_service === false;
            
            // Validate the parsed feedback has meaningful data
            if (!parsedFeedback || parsedFeedback.overallScore === 0) {
                console.error('Parsed feedback is invalid or empty:', parsedFeedback);
                throw new Error('Failed to parse AI feedback properly. The AI may have returned invalid data.');
            }
            
            // Additional validation: ensure at least some feedback data exists
            const hasTips = parsedFeedback.ATS.tips.length > 0 || 
                           parsedFeedback.content.tips.length > 0 || 
                           parsedFeedback.skills.tips.length > 0;
            
            if (!hasTips && parsedFeedback.overallScore < 10) {
                console.error('Feedback has no tips and invalid score:', parsedFeedback);
                throw new Error('AI returned incomplete feedback. Please try again.');
            }
            
            data.feedback = parsedFeedback;
            const roleKeywordAnalysis = getRoleKeywordAnalysis(jobTitle, jobDescription, parsedFeedback);
            const studentFeedback = rewriteFeedbackForStudents(parsedFeedback);
            const generatedProjectBullets = generateProjectBullets(jobTitle, roleKeywordAnalysis);
            const actionableRewrites = generateActionableRewrites(parsedFeedback);

            data.roleKeywordAnalysis = roleKeywordAnalysis;
            data.studentFeedback = studentFeedback;
            data.generatedProjectBullets = generatedProjectBullets;
            data.actionableRewrites = actionableRewrites;
            data.usedFallbackAnalysis = usedFallbackAnalysis;
            data.jobState = 'done';
            data.completedAt = Date.now();
            console.log('Saving data to KV store:', data);
            await kv.set(`resume:${uuid}`, JSON.stringify(data));
            
            // Verify it was saved
            const savedData = await kv.get(`resume:${uuid}`);
            if (!savedData) {
                throw new Error('Failed to save analysis results. Please try again.');
            }
            console.log('Verified saved data:', savedData);
            
            setStatusText('Analysis complete! Redirecting...');
            console.log('Analysis successful, redirecting to resume page');
            
            setTimeout(() => {
                navigate(`/resume/${uuid}`);
            }, 500);
        } catch (error) {
            console.error('Analysis error details:', {
                error,
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                errorType: error ? typeof error : 'undefined'
            });
            const errorMsg = error instanceof Error ? error.message : (typeof error === 'string' ? error : 'An unexpected error occurred. Please try again.');
            
            // Try to update job state in KV - use the uuid we created earlier
            try {
              const existingData = await kv.get(`resume:${uuid}`);
              if (existingData) {
                const parsed = JSON.parse(existingData);
                parsed.jobState = 'failed';
                parsed.lastError = errorMsg;
                parsed.retryCount = (parsed.retryCount || 0) + 1;
                await kv.set(`resume:${uuid}`, JSON.stringify(parsed));
                console.log('Updated KV with failed state for UUID:', uuid);
              }
            } catch (kvError) {
              console.error('Failed to update KV with error state:', kvError);
            }
            
            setStatusText(`Error: ${errorMsg}`);
            setIsProcessing(false);
            
            // Scroll to top to ensure error message is visible
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget.closest('form');
        if(!form) return;
        const formData = new FormData(form);

        const companyName = (formData.get('company-name') as string)?.trim();
        const jobTitle = (formData.get('job-title') as string)?.trim();
        const jobDescription = (formData.get('job-description') as string)?.trim();

        // Validation
        if(!companyName) {
            setStatusText('Error: Please enter a company name');
            return;
        }
        if(!jobTitle) {
            setStatusText('Error: Please enter a job title');
            return;
        }
        if(!jobDescription) {
            setStatusText('Error: Please enter a job description');
            return;
        }
        if(jobDescription.length > 5000) {
            setStatusText('Error: Job description is too long (max 5000 characters). Please shorten it to improve analysis speed.');
            return;
        }
        if(!file) {
            setStatusText('Error: Please upload a resume file');
            return;
        }

        // Warning for long descriptions
        if(jobDescription.length > 2000) {
            if(!confirm('Your job description is quite long. This may increase analysis time to 3+ minutes. Continue?')) {
                return;
            }
        }

        handleAnalyze({ companyName, jobTitle, jobDescription, file });
    }

    return (
        <main className="app-shell bg-cover">
            <Navbar />

            <section className="main-section">
                <div className="page-heading py-16">
                    <h1>Smart feedback for your dream job</h1>
                    {isProcessing && (
                        <>
                            <h2>{statusText}</h2>
                            <img src="/images/resume-scan.gif" className="w-full" />
                        </>
                    )}
                    {!isProcessing && statusText && statusText.startsWith('Error') && (
                        <>
                            <h2 className="text-red-600">{statusText}</h2>
                            <button 
                                className="primary-button mt-4"
                                onClick={() => setStatusText('')}
                            >
                                Try Again
                            </button>
                        </>
                    )}
                    {!isProcessing && (!statusText || !statusText.startsWith('Error')) && (
                        <h2>Drop your resume for an ATS score and improvement tips</h2>
                    )}
                    {!isProcessing && (
                        <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
                            <div className="form-div">
                                <label htmlFor="company-name">Company Name</label>
                                <input type="text" name="company-name" placeholder="Company Name" id="company-name" />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-title">Job Title</label>
                                <input type="text" name="job-title" placeholder="Job Title" id="job-title" />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-description">Job Description</label>
                                <textarea rows={5} name="job-description" placeholder="Job Description" id="job-description" />
                            </div>

                            <div className="form-div">
                                <label htmlFor="uploader">Upload Resume</label>
                                <FileUploader onFileSelect={handleFileSelect} />
                            </div>

                            <button className="primary-button" type="submit">
                                Analyze Resume
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    )
}
export default Upload
