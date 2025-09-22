import { useState, useRef } from "react"
import { Camera, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { cn } from "@/lib/utils"

interface AvatarUploadProps {
  currentAvatarUrl?: string
  onAvatarUpdate: (url: string) => void
  userInitials: string
  className?: string
}

export function AvatarUpload({ currentAvatarUrl, onAvatarUpdate, userInitials, className }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, выберите изображение",
        variant: "destructive",
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Ошибка",
        description: "Размер файла не должен превышать 5MB",
        variant: "destructive",
      })
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload file
    uploadAvatar(file)
  }

  const uploadAvatar = async (file: File) => {
    try {
      setUploading(true)

      const fileExt = file.name.split('.').pop()
      const fileName = `avatar-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage
        .from('progress-photos')
        .getPublicUrl(filePath)

      onAvatarUpdate(data.publicUrl)
      setPreviewUrl(null)

      toast({
        title: "Успешно!",
        description: "Аватар обновлен",
      })
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить аватар",
        variant: "destructive",
      })
      setPreviewUrl(null)
    } finally {
      setUploading(false)
    }
  }

  const removeAvatar = async () => {
    onAvatarUpdate('')
    setPreviewUrl(null)
    toast({
      title: "Аватар удален",
      description: "Изображение профиля удалено",
    })
  }

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="relative">
        <Avatar className="h-24 w-24">
          <AvatarImage src={previewUrl || currentAvatarUrl} alt="Аватар" />
          <AvatarFallback className="text-lg">{userInitials}</AvatarFallback>
        </Avatar>
        
        {(currentAvatarUrl || previewUrl) && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
            onClick={removeAvatar}
            disabled={uploading}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2"
        >
          {uploading ? (
            <Upload className="h-4 w-4 animate-pulse" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          {uploading ? "Загрузка..." : "Изменить"}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}