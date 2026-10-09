"""Generate Android launcher icons from the shapes in public/favicon.svg."""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android" / "app" / "src" / "main" / "res"
ORANGE = "#f16b43"
WHITE = "#ffffff"
DENSITIES = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
SUPERSAMPLE = 4


def logo(draw, scale, offset):
    offset_x, offset_y = offset if isinstance(offset, tuple) else (offset, offset)

    def rect(x0, y0, x1, y1):
        draw.rounded_rectangle(
            [(offset_x + x0 * scale, offset_y + y0 * scale),
             (offset_x + x1 * scale, offset_y + y1 * scale)],
            radius=3 * scale,
            fill=WHITE,
        )

    rect(10, 10, 18, 18)
    rect(22, 10, 30, 18)
    rect(10, 22, 18, 30)
    draw.ellipse(
        [(offset_x + 22 * scale, offset_y + 22 * scale),
         (offset_x + 30 * scale, offset_y + 30 * scale)],
        fill=WHITE,
    )


def render(size, kind):
    large = int(size * SUPERSAMPLE)
    image = Image.new("RGBA", (large, large), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    if kind != "foreground":
        if kind == "round":
            draw.ellipse([(0, 0), (large - 1, large - 1)], fill=ORANGE)
        else:
            draw.rounded_rectangle(
                [(0, 0), (large - 1, large - 1)],
                radius=large * 0.3,
                fill=ORANGE,
            )
        logo(draw, large / 40, 0)
    else:
        # Keep the mark inside Android's adaptive-icon safe circle.
        logo(draw, large * 2.2 / 108, large * 10 / 108)

    return image.resize((int(size), int(size)), Image.Resampling.LANCZOS)


def main():
    for density, factor in DENSITIES.items():
        target = RES / f"mipmap-{density}"
        target.mkdir(parents=True, exist_ok=True)
        for filename, dp, kind in (
            ("ic_launcher.png", 48, "square"),
            ("ic_launcher_round.png", 48, "round"),
            ("ic_launcher_foreground.png", 108, "foreground"),
        ):
            render(round(dp * factor), kind).save(target / filename)

    for path in RES.rglob("splash.png"):
        original = Image.open(path)
        width, height = original.size
        image = Image.new("RGB", (width, height), ORANGE)
        draw = ImageDraw.Draw(image)
        mark_size = min(width, height) * 0.22
        logo(draw, mark_size / 20, ((width - mark_size * 2) / 2, (height - mark_size * 2) / 2))
        image.save(path)


if __name__ == "__main__":
    main()
