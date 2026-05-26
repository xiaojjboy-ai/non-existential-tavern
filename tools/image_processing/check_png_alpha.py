import sys
import os
from PIL import Image

def check_image_alpha(image_path):
    if not os.path.exists(image_path):
        print(f"Error: File not found at {image_path}")
        return False, "file_not_found"

    try:
        with Image.open(image_path) as img:
            # 检查图像通道模式
            mode = img.mode
            print(f"Image format: {img.format}, Mode: {mode}, Size: {img.size}")
            
            # 是否支持透明通道
            if mode not in ('RGBA', 'LA', 'PA') and 'transparency' not in img.info:
                return False, f"No alpha channel (mode: {mode})"

            # 如果是带 Alpha 的模式，获取 Alpha 通道的极值
            if mode in ('RGBA', 'LA'):
                alpha = img.getchannel('A')
                extrema = alpha.getextrema()  # 返回 (min, max)
                print(f"Alpha channel extrema: {extrema}")
                
                if extrema[0] < 255:
                    # 计算透明像素的比例
                    alpha_data = list(alpha.getdata())
                    total_pixels = len(alpha_data)
                    transparent_pixels = sum(1 for a in alpha_data if a < 255)
                    ratio = (transparent_pixels / total_pixels) * 100
                    print(f"Transparent pixels: {transparent_pixels}/{total_pixels} ({ratio:.2f}%)")
                    
                    if ratio > 5.0: # 透明像素占比需大于 5%
                        return True, f"Valid alpha channel with {ratio:.2f}% transparent pixels"
                    else:
                        return False, f"Too few transparent pixels ({ratio:.2f}%)"
                else:
                    return False, "Alpha channel exists but all pixels are fully opaque (alpha=255)"
            
            # 如果是调色板模式 Palette
            elif mode == 'P':
                transparency = img.info.get('transparency')
                if transparency is not None:
                    rgba_img = img.convert('RGBA')
                    alpha = rgba_img.getchannel('A')
                    extrema = alpha.getextrema()
                    print(f"Palette image converted to RGBA, alpha extrema: {extrema}")
                    if extrema[0] < 255:
                        alpha_data = list(alpha.getdata())
                        total = len(alpha_data)
                        trans = sum(1 for a in alpha_data if a < 255)
                        ratio = (trans / total) * 100
                        print(f"Transparent pixels in Palette: {trans}/{total} ({ratio:.2f}%)")
                        if ratio > 5.0:
                            return True, f"Palette with transparency ({ratio:.2f}%)"
                    return False, "Palette image has transparency info but no transparent pixels found"
                else:
                    return False, "Palette mode without transparency info"
            
            return False, f"Unsupported transparent mode check: {mode}"

    except Exception as e:
        return False, f"Execution failed: {str(e)}"

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python check_png_alpha.py <path_to_png>")
        sys.exit(1)
        
    path = sys.argv[1]
    is_valid, msg = check_image_alpha(path)
    print(f"Result: {'PASS' if is_valid else 'FAIL'} - {msg}")
    
    if is_valid:
        sys.exit(0)
    else:
        sys.exit(2)
