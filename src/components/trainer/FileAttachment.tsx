import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X, FileImage, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FileAttachmentProps {
  onFileUploaded: (fileUrl: string, fileName: string, fileType: string) => void;
}

interface UploadedFile {
  url: string;
  name: string;
  type: string;
}

export const FileAttachment = ({ onFileUploaded }: FileAttachmentProps) => {
  const [uploading, setUploading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/csv'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Unsupported file type. Please upload images, PDF, or CSV files.");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('ai-chat-attachments')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('ai-chat-attachments')
        .getPublicUrl(data.path);

      const uploadedFile = {
        url: publicUrl,
        name: file.name,
        type: file.type
      };

      setAttachedFiles([...attachedFiles, uploadedFile]);
      onFileUploaded(publicUrl, file.name, file.type);
      toast.success("File attached successfully");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <FileImage className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        accept="image/*,.pdf,.csv"
        className="hidden"
      />
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleFileSelect}
        disabled={uploading}
        type="button"
      >
        <Paperclip className="h-4 w-4 mr-2" />
        {uploading ? "Uploading..." : "Attach file"}
      </Button>

      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md text-sm"
            >
              {getFileIcon(file.type)}
              <span className="max-w-[150px] truncate">{file.name}</span>
              <button
                onClick={() => handleRemoveFile(index)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};