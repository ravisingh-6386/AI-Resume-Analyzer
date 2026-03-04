import {Link, useNavigate, useParams} from "react-router";
import {useEffect, useState} from "react";
import {usePuterStore} from "../lib/puter";
import {useAuthStore} from "../lib/auth";
import Summary from "../components/Summary";
import ATS from "../components/ATS";
import Details from "../components/Details";

export const meta = () => ([
    { title: 'Resumind | Review ' },
    { name: 'description', content: 'Detailed overview of your resume' },
])

const Resume = () => {
    const { isLoading, fs, kv } = usePuterStore();
    const { isAuthenticated } = useAuthStore();
    const { id } = useParams();
    const [imageUrl, setImageUrl] = useState('');
    const [resumeUrl, setResumeUrl] = useState('');
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [loadingError, setLoadingError] = useState('');
    const [pollingTimeout, setPollingTimeout] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        if(!isLoading && !isAuthenticated) navigate(`/auth?next=/resume/${id}`);
    }, [isLoading, isAuthenticated, id, navigate])

    useEffect(() => {
        const loadResume = async () => {
            try {
                console.log(`Loading resume with id: ${id}`);
                const resume = await kv.get(`resume:${id}`);

                if(!resume) {
                    setLoadingError('Resume not found. Please upload a resume first.');
                    return;
                }

                const data = JSON.parse(resume);
                console.log('Resume data loaded:', data);

                const resumeBlob = await fs.read(data.resumePath);
                if(!resumeBlob) {
                    setLoadingError('Failed to load resume file');
                    return;
                }

                const pdfBlob = new Blob([resumeBlob], { type: 'application/pdf' });
                const resumeUrl = URL.createObjectURL(pdfBlob);
                setResumeUrl(resumeUrl);

                const imageBlob = await fs.read(data.imagePath);
                if(!imageBlob) {
                    setLoadingError('Failed to load resume preview');
                    return;
                }
                const imageUrl = URL.createObjectURL(imageBlob);
                setImageUrl(imageUrl);

                if(data.feedback) {
                    setFeedback(data.feedback);
                    console.log('Feedback loaded:', data.feedback);
                } else {
                    console.log('No feedback available yet');
                }
            } catch (error) {
                console.error('Error loading resume:', error);
                setLoadingError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        if(id) {
            loadResume();
            
            // Track elapsed time
            const startTime = Date.now();
            const timeTracker = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
            
            // Poll for updates: check every 2 seconds for up to 3 minutes
            let pollCount = 0;
            const maxPolls = 90; // 90 checks × 2 seconds = 3 minutes
            const pollInterval = setInterval(async () => {
                pollCount++;
                if (!feedback) {
                    console.log(`Polling for feedback update... (attempt ${pollCount}/${maxPolls})`);
                    await loadResume();
                    
                    // Stop polling after 3 minutes
                    if (pollCount >= maxPolls) {
                        clearInterval(pollInterval);
                        clearInterval(timeTracker);
                        console.warn('Feedback polling timeout: 3 minutes reached');
                        setPollingTimeout(true);
                        setLoadingError('Analysis is taking longer than expected. The AI service might be busy or the job description might be too long. Please try uploading again with a shorter description.');
                    }
                } else {
                    clearInterval(pollInterval);
                    clearInterval(timeTracker);
                }
            }, 2000);

            return () => {
                clearInterval(pollInterval);
                clearInterval(timeTracker);
            };
        }
    }, [id]);

    return (
        <main className="!pt-0">
            <nav className="resume-nav">
                <Link to="/" className="back-button">
                    <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
                    <span className="text-gray-800 text-sm font-semibold">Back to Homepage</span>
                </Link>
            </nav>
            <div className="flex flex-row w-full max-lg:flex-col-reverse">
                <section className="feedback-section bg-[url('/images/bg-small.svg') bg-cover h-[100vh] sticky top-0 items-center justify-center">
                    {loadingError && !imageUrl ? (
                        <div className="text-center p-5">
                            <p className="text-red-600 font-semibold">{loadingError}</p>
                            <Link to="/upload" className="text-blue-600 underline mt-3 inline-block">
                                Upload a new resume
                            </Link>
                        </div>
                    ) : imageUrl && resumeUrl ? (
                        <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit">
                            <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                                <img
                                    src={imageUrl}
                                    className="w-full h-full object-contain rounded-2xl"
                                    title="resume"
                                />
                            </a>
                        </div>
                    ) : (
                        <div className="text-center p-5">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                            <p className="text-gray-600 mt-4">Loading resume...</p>
                        </div>
                    )}
                </section>
                <section className="feedback-section">
                    <h2 className="text-4xl !text-black font-bold">Resume Review</h2>
                    {pollingTimeout ? (
                        <div className="flex flex-col items-center justify-center gap-4 text-center">
                            <div className="text-red-600 text-lg font-semibold">⏱️ Analysis Timeout</div>
                            <p className="text-gray-700 max-w-md">
                                The AI analysis is taking longer than expected. This might be due to:
                            </p>
                            <ul className="text-left text-gray-600 text-sm space-y-2 ml-8">
                                <li>• High server load - AI service is busy</li>
                                <li>• Large resume file size</li>
                                <li>• Very long job description</li>
                                <li>• Network connectivity issues</li>
                            </ul>
                            <div className="flex gap-4 mt-4">
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    Check Status Again
                                </button>
                                <Link 
                                    to="/upload"
                                    className="px-6 py-2 border-2 border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                                >
                                    Upload New Resume
                                </Link>
                            </div>
                        </div>
                    ) : loadingError ? (
                        <div className="text-red-600 text-center">
                            <p className="mb-4">{loadingError}</p>
                            <Link to="/upload" className="text-blue-600 underline">
                                Upload a new resume
                            </Link>
                        </div>
                    ) : feedback ? (
                        <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
                            <Summary feedback={feedback} />
                            <ATS score={feedback.ATS.score || 0} suggestions={feedback.ATS.tips || []} />
                            <Details feedback={feedback} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-4">
                            <img src="/images/resume-scan-2.gif" className="w-full max-w-md" />
                            <div className="text-center">
                                <p className="text-gray-700 font-semibold">AI is analyzing your resume...</p>
                                <p className="text-gray-500 text-sm mt-2">
                                    This usually takes 2-3 minutes
                                    {elapsedTime > 0 && <span className="font-medium"> (elapsed: {elapsedTime}s)</span>}
                                </p>
                                <div className="mt-4 flex items-center justify-center gap-2">
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce animation-delay-200"></div>
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce animation-delay-400"></div>
                                </div>
                                {elapsedTime > 90 && (
                                    <p className="text-amber-600 text-sm mt-4">
                                        ⚠️ Taking longer than usual. AI service may be busy...
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </main>
    )
}
export default Resume
