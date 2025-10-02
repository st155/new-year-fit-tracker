import { useState, useRef, useCallback } from "react"
import { Camera, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Cropper from "react-easy-crop"
import type { Area } from "react-easy-crop"
import { useAuth } from "@/hooks/useAuth"

interface AvatarUploadProps {
  currentAvatarUrl?: string
  onAvatarUpdate: (url: string) => void
  userInitials: string
  className?: string
}

export function AvatarUpload({ currentAvatarUrl, onAvatarUpdate, userInitials, className }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image()
      image.addEventListener('load', () => resolve(image))
      image.addEventListener('error', error => reject(error))
      image.src = url
    })

  const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('No 2d context')
    }

    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    )

    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) {
          reject(new Error('Canvas is empty'))
          return
        }
        resolve(blob)
      }, 'image/jpeg', 0.95)
    })
  }

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

    // Create preview for cropping
    const reader = new FileReader()
    reader.onload = () => {
      setImageSrc(reader.result as string)
      setCropDialogOpen(true)
    }
    reader.readAsDataURL(file)
  }

  const handleCropConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return

    try {
      setUploading(true)
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels)
      
      // Create a file from the blob
      const file = new File([croppedImage], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' })
      
      // Upload the cropped image
      await uploadAvatar(file)
      
      setCropDialogOpen(false)
      setImageSrc(null)
    } catch (error) {
      console.error('Error cropping image:', error)
      toast({
        title: "Ошибка",
        description: "Не удалось обрезать изображение",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
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

      // Persist avatar URL to user profile before reload
      if (user?.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ avatar_url: data.publicUrl })
          .eq('user_id', user.id);
        if (profileError) throw profileError;
      }

      // Update parent state for immediate UI feedback
      onAvatarUpdate(data.publicUrl)
      setPreviewUrl(null)

      toast({
        title: "Успешно!",
        description: "Аватар обновлен",
      })

      // Reload page to show updated avatar from DB
      setTimeout(() => {
        window.location.reload()
      }, 500)
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
    <>
      <div className={cn("flex flex-col items-center gap-4", className)}>
        <div className="relative">
          <Avatar className="h-24 w-24">
            <AvatarImage 
              src={previewUrl || currentAvatarUrl} 
              alt="Аватар"
              className="object-cover"
            />
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

      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Обрезать фото</DialogTitle>
          </DialogHeader>
          <div className="relative h-[400px] bg-muted rounded-lg overflow-hidden">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Масштаб</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setCropDialogOpen(false)
                setImageSrc(null)
              }}
              disabled={uploading}
            >
              Отмена
            </Button>
            <Button onClick={handleCropConfirm} disabled={uploading}>
              {uploading ? "Загрузка..." : "Сохранить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}