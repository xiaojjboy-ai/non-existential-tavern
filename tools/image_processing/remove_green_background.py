import sys
import os
from PIL import Image

def remove_green_background(input_path, output_path, inner_g=20, outer_g=55):
    if not os.path.exists(input_path):
        print(f"Error: File not found {input_path}")
        return False

    try:
        img = Image.open(input_path).convert("RGBA")
        width, height = img.size
        pixels = img.load()

        for y in range(height):
            for x in range(width):
                r, g, b, a = pixels[x, y]
                
                # 计算 greenness (绿色相对于红蓝的最大差值)
                max_rb = max(r, b)
                greenness = g - max_rb
                
                if greenness >= outer_g:
                    # 完全的绿色背景，直接设为完全透明
                    pixels[x, y] = (0, 0, 0, 0)
                elif greenness >= inner_g:
                    # 过渡带，进行平滑插值羽化
                    factor = (greenness - inner_g) / (outer_g - inner_g)
                    new_a = int((1.0 - factor) * 255)
                    
                    # 进行 De-spill (去绿边溢色): 将绿色值降到与红蓝最大值齐平，防止绿边
                    new_g = max_rb
                    pixels[x, y] = (r, new_g, b, new_a)
                else:
                    # 主体像素
                    # 即使是主体像素，如果稍微有些偏绿 (比如 0 < greenness < inner_g)，也进行轻微的 De-spill 净化
                    if g > max_rb:
                        # 抑制绿光
                        new_g = int((r + b) / 2)
                        pixels[x, y] = (r, new_g, b, a)

        img.save(output_path, "PNG")
        print(f"Successfully removed green screen and saved to {output_path}")
        return True
    except Exception as e:
        print(f"Green screen removal failed: {e}")
        return False

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python remove_green_background.py <input_path> <output_path>")
        sys.exit(1)
        
    in_p = sys.argv[1]
    out_p = sys.argv[2]
    
    success = remove_green_background(in_p, out_p)
    if success:
        sys.exit(0)
    else:
        sys.exit(1)
