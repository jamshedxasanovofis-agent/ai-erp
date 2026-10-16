// Generates a real downloadable PDF file from a document's rendered HTML,
// bypassing the browser's print dialog entirely — avoids Chrome's built-in
// print headers/footers (date/time, page title, URL, page number) that
// users can't remove from a window.print() flow without digging into
// "More settings" every single time.

export async function downloadDocPdf(html: string, filename: string) {
  const html2pdf = (await import("html2pdf.js")).default

  // html2canvas measures the target element's own layout box, which comes
  // out as height:0 if the element itself is pulled off-screen via a
  // negative absolute/fixed offset. Instead, keep the element in normal
  // static flow (so it lays out correctly) and clip visibility via a
  // zero-size, overflow-hidden ancestor wrapper.
  const clip = document.createElement("div")
  clip.style.position = "fixed"
  clip.style.top = "0"
  clip.style.left = "0"
  clip.style.width = "0"
  clip.style.height = "0"
  clip.style.overflow = "hidden"
  clip.style.zIndex = "-1"

  const container = document.createElement("div")
  container.innerHTML = html
  container.style.width = "210mm"
  clip.appendChild(container)
  document.body.appendChild(clip)

  try {
    const options = {
      margin: 0,
      filename,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2.5, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      // "css" mode paginates by DOM element boundaries (respecting our
      // page-break-inside:avoid rules) instead of "legacy" mode, which
      // slices the rendered canvas by raw pixel offsets and can cut
      // straight through the middle of a paragraph or table row.
      // (Not in html2pdf.js's shipped type declarations, hence the `any`.)
      pagebreak: { mode: ["css"] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any

    await html2pdf().from(container).set(options).save()
  } finally {
    document.body.removeChild(clip)
  }
}
