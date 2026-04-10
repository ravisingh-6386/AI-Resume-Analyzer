import { type MouseEvent, useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { formatSize } from "../lib/utils";

interface FileUploaderProps {
  onFileSelect?: (file: File | null) => void;
}

const FileUploader = ({ onFileSelect }: FileUploaderProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [dropError, setDropError] = useState("");
  const maxFileSize = 20 * 1024 * 1024;

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0] || null;
      setDropError("");
      setSelectedFile(file);
      onFileSelect?.(file);
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "application/pdf": [".pdf"] },
    maxSize: maxFileSize,
    onDropRejected: (rejections) => {
      const firstRejection = rejections[0];
      if (!firstRejection) return;
      const code = firstRejection.errors[0]?.code;
      if (code === "file-too-large") {
        setDropError(`File is too large. Maximum size is ${formatSize(maxFileSize)}.`);
      } else if (code === "file-invalid-type") {
        setDropError("Only PDF files are supported.");
      } else {
        setDropError("Unable to upload this file. Please try a different PDF.");
      }
    },
  });

  const handleRemove = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedFile(null);
    setDropError("");
    setInputKey((currentKey) => currentKey + 1);
    onFileSelect?.(null);
  };

  const dropzoneClassName = `group rounded-2xl border-2 border-dashed p-6 transition-all duration-200 focus-within:ring-4 focus-within:ring-indigo-100 ${
    isDragReject
      ? "border-red-300 bg-red-50"
      : isDragActive
      ? "border-indigo-500 bg-indigo-50"
      : "border-indigo-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/40"
  }`;

  return (
    <div className="w-full">
      <div
        {...getRootProps({
          className: dropzoneClassName,
          "aria-label": "Resume file uploader",
        })}
      >
        <input key={inputKey} {...getInputProps()} />

        <div className="cursor-pointer space-y-4 text-center">
          {selectedFile ? (
            <div
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <img src="/images/pdf.png" alt="PDF file" className="size-10" />
                <div className="text-left">
                  <p className="max-w-xs truncate text-sm font-semibold text-slate-700">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-500">{formatSize(selectedFile.size)}</p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                onClick={handleRemove}
                aria-label="Remove selected file"
              >
                <img src="/icons/cross.svg" alt="remove" className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div>
              <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 16V5m0 0l-4 4m4-4l4 4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 16.5v1A2.5 2.5 0 006.5 20h11a2.5 2.5 0 002.5-2.5v-1"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <p className="text-base text-slate-600 sm:text-lg">
                <span className="font-semibold text-slate-800">Click to upload</span> or drag &amp; drop
              </p>
              <p className="text-sm text-slate-500">PDF only, up to {formatSize(maxFileSize)}</p>
              {isDragActive && !isDragReject && (
                <p className="mt-2 text-sm font-semibold text-indigo-600">Drop your file to upload</p>
              )}
            </div>
          )}
        </div>
      </div>

      {dropError && (
        <p className="mt-2 text-sm font-medium text-red-600" role="alert">
          {dropError}
        </p>
      )}
    </div>
  );
};

export default FileUploader;
