/**
 * مكون صورة مع دعم التخزين المحلي
 * يحوّل روابط Supabase Storage إلى روابط محلية في Electron
 */
import { useCachedImageUrl } from "@/hooks/useCachedImageUrl";

interface CachedBackgroundImgProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  remoteUrl: string;
}

export function CachedBackgroundImg({ remoteUrl, ...props }: CachedBackgroundImgProps) {
  const localUrl = useCachedImageUrl(remoteUrl);
  
  if (!localUrl) return null;
  
  return <img src={localUrl} {...props} />;
}
