import glob
from PIL import Image
MAX = 2200
for f in sorted(glob.glob('art/*.png')):
    im = Image.open(f)
    if im.width > MAX:
        h = round(im.height * MAX / im.width)
        im.resize((MAX, h), Image.LANCZOS).save(f)
        print('resized', f, '->', (MAX, h))
    else:
        print('ok', f, im.size)
