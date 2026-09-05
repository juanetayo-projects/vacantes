import ExcelJS from 'exceljs'

export async function exportarExcel(
  nombre: string,
  columnas: { header: string; key: string; width?: number }[],
  filas: Record<string, unknown>[],
) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Datos')
  ws.columns = columnas.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18 }))

  ws.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D2D6B' } }
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
  })
  filas.forEach((f) => ws.addRow(f))

  const buf = await wb.xlsx.writeBuffer()
  descargar(new Blob([buf]), `${nombre}.xlsx`)
}

export async function exportarPDF(titulo: string, headers: string[], filas: (string | number)[][]) {
  const pdfMakeModule = await import('pdfmake/build/pdfmake')
  const pdfFontsModule = await import('pdfmake/build/vfs_fonts')
  const pdfMake = (pdfMakeModule as any).default ?? pdfMakeModule
  const pdfFonts = pdfFontsModule as any
  pdfMake.vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs

  pdfMake.createPdf({
    pageOrientation: 'landscape',
    content: [
      { text: titulo, style: 'h' },
      {
        table: { headerRows: 1, body: [headers.map((h) => ({ text: h, color: 'white', bold: true })), ...filas] },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex === 0 ? '#0D2D6B' : rowIndex % 2 ? '#F1F5F9' : null),
        },
      },
    ],
    styles: { h: { fontSize: 14, bold: true, color: '#0D2D6B', margin: [0, 0, 0, 8] } },
    defaultStyle: { fontSize: 8 },
  }).download(`${titulo}.pdf`)
}

function descargar(blob: Blob, archivo: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = archivo
  a.click()
  URL.revokeObjectURL(url)
}
