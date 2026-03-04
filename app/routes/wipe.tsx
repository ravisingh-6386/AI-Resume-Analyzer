import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { usePuterStore } from "../lib/puter";
import { useAuthStore } from "../lib/auth";
import Navbar from "../components/Navbar";

const WipeApp = () => {
    const { isLoading, error, clearError, fs, ai, kv } = usePuterStore();
    const { isAuthenticated, user } = useAuthStore();
    const navigate = useNavigate();
    const [files, setFiles] = useState<FSItem[]>([]);

    const loadFiles = async () => {
        const files = (await fs.readDir("./")) as FSItem[];
        setFiles(files);
    };

    useEffect(() => {
        loadFiles();
    }, []);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate("/auth?next=/wipe");
        }
    }, [isLoading, isAuthenticated, navigate]);

    const handleDelete = async () => {
        files.forEach(async (file) => {
            await fs.delete(file.path);
        });
        await kv.flush();
        loadFiles();
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error {error}</div>;
    }

    return (
        <>
            <Navbar />
            <div className="main-section">
                <div>
                    Authenticated as: {user?.name}
                    <div>Existing files:</div>
                    <div className="flex flex-col gap-4">
                        {files.map((file) => (
                            <div key={file.id} className="flex flex-row gap-4">
                                <p>{file.name}</p>
                            </div>
                        ))}
                    </div>
                    <div>
                        <button
                            className="bg-red-500 text-white px-4 py-2 rounded-md cursor-pointer hover:bg-red-600"
                            onClick={() => handleDelete()}
                        >
                            Wipe App Data
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default WipeApp;
