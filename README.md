# SaleCompass website

Marketing website for **SaleCompass**, an AI revenue intelligence platform for SMEs.

Live preview: https://salaarkhan53.github.io/sale_compass/

## Structure

- `index.html`, `about.html`, `services.html`, `MeetFounder.html`, `research.html`, `early-adopters.html`, `contact.html`: the seven pages
- `assets/css/main.css`: the shared design system
- `assets/js/boot.js`: runs before first paint (motion / reduced-motion setup)
- `assets/js/main.js`: navigation, animations, contact form, lightbox and other interactions
- `assets/img/`: optimised images and the Certificate of Incorporation PDF

It is a static site with no build step. Open `index.html` through any static server, or deploy the folder as-is.

## Going live on salecompass.uk

The canonical and social-preview links currently point at the GitHub Pages address. When the domain is moved here, change those links in the `<head>` of each page to `https://salecompass.uk/`.
