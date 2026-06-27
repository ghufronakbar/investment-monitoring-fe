'use client';

/**
 * File Uploader Component
 * Reusable component for uploading files with single/multi mode
 * Supports images and PDFs with callback for returned URLs
 */
import { useState, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { uploadSingle, uploadMultiple } from '@/services';
import { isApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { UploadOptions, UploadResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
    Upload,
    X,
    FileText,
    Image as ImageIcon,
    RefreshCw,
    Plus,
    AlertCircle,
} from 'lucide-react';

export type FileType = 'image' | 'pdf' | 'all';

export interface UploadedFile {
    id?: string;
    url: string;
    publicId: string;
    format: string;
    fileName: string;
    mimeType?: string;
    size?: number;
    checksum?: string;
    uploadedByUserId?: string;
    uploadedByOrgId?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    createdAt?: string;
}

interface FileUploaderProps {
    mode: 'single' | 'multi';
    accept?: FileType;
    maxFiles?: number;
    value?: string | string[];
    onChange?: (value: string | string[]) => void;
    onUpload?: (files: UploadedFile | UploadedFile[]) => void;
    uploadOptions?: UploadOptions;
    disabled?: boolean;
    className?: string;
    placeholder?: string;
}

const MIME_TYPES: Record<FileType, string> = {
    image: 'image/jpeg,image/png',
    pdf: 'application/pdf',
    all: 'image/jpeg,image/png,application/pdf',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(format: string) {
    if (['jpg', 'jpeg', 'png'].includes(format.toLowerCase())) {
        return <ImageIcon className="w-4 h-4 text-blue-500" />;
    }
    return <FileText className="w-4 h-4 text-red-500" />;
}

const UPLOAD_ERROR_MESSAGES: Record<string, string> = {
    FILE_EMPTY: 'The selected file is empty.',
    FILE_REQUIRED: 'Please select a file to upload.',
    FILE_TOO_LARGE: 'The selected file is too large.',
    FILE_TOO_LARGE_5MB_MAX: 'File too large. Maximum 5MB allowed.',
    INVALID_FILE_TYPE: 'Invalid file type. Only JPG, PNG, and PDF files are allowed.',
    USER_NOT_MEMBER_OF_ORGANIZATION: 'You are not a member of the selected organization.',
    ENTITY_TYPE_AND_ENTITY_ID_REQUIRED_TOGETHER: 'Upload entity type and entity ID must be provided together.',
};

function getUploadErrorMessage(error: unknown): string {
    if (isApiError(error)) {
        return UPLOAD_ERROR_MESSAGES[error.responseMessage] || error.responseMessage;
    }

    if (error instanceof Error) {
        return UPLOAD_ERROR_MESSAGES[error.message] || error.message;
    }

    return 'Failed to upload file';
}

function mapUploadedFile(data: UploadResponse, fallbackFileName?: string): UploadedFile {
    return {
        id: data.id,
        url: data.url,
        publicId: data.publicId,
        format: data.format,
        fileName: data.fileName || fallbackFileName || 'File',
        mimeType: data.mimeType,
        size: data.size,
        checksum: data.checksum,
        uploadedByUserId: data.uploadedByUserId,
        uploadedByOrgId: data.uploadedByOrgId ?? null,
        entityType: data.entityType ?? null,
        entityId: data.entityId ?? null,
        createdAt: data.createdAt,
    };
}

export function FileUploader({
    mode,
    accept = 'all',
    maxFiles = 10,
    value,
    onChange,
    onUpload,
    uploadOptions,
    disabled = false,
    className,
    placeholder,
}: FileUploaderProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(() => {
        if (mode === 'single' && typeof value === 'string' && value) {
            return [{ url: value, publicId: '', format: '', fileName: 'Uploaded file' }];
        }
        if (mode === 'multi' && Array.isArray(value)) {
            return value.map((url) => ({ url, publicId: '', format: '', fileName: 'Uploaded file' }));
        }
        return [];
    });

    // Single file upload mutation
    const singleMutation = useMutation({
        mutationFn: (file: File) => uploadSingle(file, uploadOptions),
        onSuccess: (data, file) => {
            const uploaded = mapUploadedFile(data, file.name);
            setUploadedFiles([uploaded]);
            onChange?.(data.url);
            onUpload?.(uploaded);
            toast.success('File uploaded successfully');
        },
        onError: (error) => {
            toast.error(getUploadErrorMessage(error));
        },
    });

    // Multiple files upload mutation
    const multipleMutation = useMutation({
        mutationFn: (files: File[]) => uploadMultiple(files, uploadOptions),
        onSuccess: (data, files) => {
            const newFiles = data.map((item, index) =>
                mapUploadedFile(item, files[index]?.name)
            );
            const allFiles = [...uploadedFiles, ...newFiles];
            setUploadedFiles(allFiles);
            onChange?.(allFiles.map((f) => f.url));
            onUpload?.(newFiles);
            toast.success(`${data.length} file(s) uploaded successfully`);
        },
        onError: (error) => {
            toast.error(getUploadErrorMessage(error));
        },
    });

    const isLoading = singleMutation.isPending || multipleMutation.isPending;

    const validateFiles = useCallback(
        (files: File[]): File[] => {
            const valid: File[] = [];
            const acceptMimes = MIME_TYPES[accept].split(',');

            for (const file of files) {
                // Check MIME type
                if (!acceptMimes.includes(file.type)) {
                    toast.error(`${file.name}: Invalid file type. Only ${accept === 'all' ? 'images and PDFs' : accept} allowed.`);
                    continue;
                }
                // Check size
                if (file.size > MAX_FILE_SIZE) {
                    toast.error(`${file.name}: File too large. Maximum 5MB allowed.`);
                    continue;
                }
                valid.push(file);
            }

            // Check max files for multi mode
            if (mode === 'multi') {
                const remaining = maxFiles - uploadedFiles.length;
                if (valid.length > remaining) {
                    toast.error(`Only ${remaining} more file(s) can be uploaded.`);
                    return valid.slice(0, remaining);
                }
            }

            return valid;
        },
        [accept, maxFiles, mode, uploadedFiles.length]
    );

    const handleFiles = useCallback(
        (files: FileList | null) => {
            if (!files || files.length === 0) return;

            const fileArray = Array.from(files);
            const validFiles = validateFiles(fileArray);

            if (validFiles.length === 0) return;

            if (mode === 'single') {
                singleMutation.mutate(validFiles[0]);
            } else {
                multipleMutation.mutate(validFiles);
            }
        },
        [mode, singleMutation, multipleMutation, validateFiles]
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFiles(e.target.files);
        // Reset input so same file can be uploaded again
        if (inputRef.current) inputRef.current.value = '';
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        handleFiles(e.dataTransfer.files);
    };

    const removeFile = (index: number) => {
        const newFiles = uploadedFiles.filter((_, i) => i !== index);
        setUploadedFiles(newFiles);
        if (mode === 'single') {
            onChange?.('');
        } else {
            onChange?.(newFiles.map((f) => f.url));
        }
    };

    const replaceFile = () => {
        inputRef.current?.click();
    };

    const openFilePicker = () => {
        inputRef.current?.click();
    };

    const canAddMore = mode === 'multi' && uploadedFiles.length < maxFiles;

    return (
        <div className={cn('space-y-3', className)}>
            {/* Hidden file input */}
            <input
                ref={inputRef}
                type="file"
                accept={MIME_TYPES[accept]}
                multiple={mode === 'multi'}
                onChange={handleInputChange}
                disabled={disabled || isLoading}
                className="hidden"
            />

            {/* Drop zone - show when no files or can add more */}
            {(uploadedFiles.length === 0 || canAddMore) && (
                <div
                    onClick={openFilePicker}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={cn(
                        'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                        dragActive
                            ? 'border-primary bg-primary/5'
                            : 'border-slate-300 hover:border-slate-400',
                        (disabled || isLoading) && 'opacity-50 cursor-not-allowed'
                    )}
                >
                    {isLoading ? (
                        <div className="flex flex-col items-center gap-2">
                            <Spinner className="w-8 h-8" />
                            <p className="text-sm text-slate-500">Uploading...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2">
                            <Upload className="w-8 h-8 text-slate-400" />
                            <p className="text-sm text-slate-600">
                                {placeholder || `Drag and drop ${mode === 'multi' ? 'files' : 'a file'} here, or click to select`}
                            </p>
                            <p className="text-xs text-slate-400">
                                {accept === 'image' && 'JPG, PNG'}
                                {accept === 'pdf' && 'PDF'}
                                {accept === 'all' && 'JPG, PNG, PDF'}
                                {' • Max 5MB per file'}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Uploaded files list */}
            {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                        <div
                            key={file.url + index}
                            className="flex items-center gap-3 p-3 border rounded-lg bg-slate-50"
                        >
                            {/* Preview or icon */}
                            {file.format && ['jpg', 'jpeg', 'png'].includes(file.format.toLowerCase()) ? (
                                <img
                                    src={file.url}
                                    alt={file.fileName}
                                    className="w-12 h-12 object-cover rounded border"
                                />
                            ) : (
                                <div className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded border">
                                    {getFileIcon(file.format || 'pdf')}
                                </div>
                            )}

                            {/* File info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{file.fileName}</p>
                                {typeof file.size === 'number' && (
                                    <p className="text-xs text-slate-500">
                                        {formatFileSize(file.size)}
                                    </p>
                                )}
                                <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline truncate block"
                                >
                                    View file
                                </a>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-1">
                                {mode === 'single' ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={replaceFile}
                                        disabled={disabled || isLoading}
                                        className="gap-1"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        Replace
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeFile(index)}
                                        disabled={disabled || isLoading}
                                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Add more button for multi mode */}
                    {canAddMore && !isLoading && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={openFilePicker}
                            disabled={disabled}
                            className="gap-1"
                        >
                            <Plus className="w-3 h-3" />
                            Add more ({uploadedFiles.length}/{maxFiles})
                        </Button>
                    )}
                </div>
            )}

            {/* Validation hint */}
            {mode === 'multi' && uploadedFiles.length === 0 && (
                <p className="text-xs text-slate-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    At least 1 file required
                </p>
            )}
        </div>
    );
}

export default FileUploader;
