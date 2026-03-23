/**
 * Utility function to download sales data as a CSV file.
 */
export const downloadSalesCSV = (sales: any[], filterName: string) => {
  if (sales.length === 0) return;

  const headers = ["ID Venta", "Fecha", "Método Pago", "Total", "Items", "Productos"];
  
  // Helper to escape values for CSV
  const escape = (val: any) => {
    const str = String(val ?? "");
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = sales.map(sale => {
    const productsDetails = sale.items
      .map((item: any) => `${item.name} (x${item.quantity})`)
      .join(", ");

    return [
      escape(sale.id),
      escape(sale.createdAt?.toDate ? sale.createdAt.toDate().toLocaleString("es-CO") : new Date().toLocaleString("es-CO")),
      escape(sale.paymentMethod),
      sale.total,
      sale.items.length,
      escape(productsDetails)
    ];
  });

  const totalValue = sales.reduce((acc, sale) => acc + (sale.total || 0), 0);
  const totalItems = sales.reduce((acc, sale) => acc + (sale.items?.length || 0), 0);
  
  const summaryRow = [
    escape("RESUMEN"),
    "",
    escape("TOTAL GENERAL:"),
    totalValue,
    totalItems,
    ""
  ];

  const csvContent = [
    headers.map(escape).join(";"),
    ...rows.map(row => row.join(";")),
    summaryRow.join(";")
  ].join("\r\n");

  // Add UTF-8 BOM so Excel opens it correctly with accents/symbols
  const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([BOM, csvContent], { type: "text/csv;charset=utf-8;" });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  const fileName = `reporte_ventas_${filterName}_${new Date().toISOString().split('T')[0]}.csv`;
  
  link.href = url;
  link.setAttribute("download", fileName);
  link.download = fileName;
  
  // Append to body is required for some browsers
  document.body.appendChild(link);
  
  // Standard click trigger
  link.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 1000);
};

export const downloadPurchasesCSV = (purchases: any[], filterName: string) => {
  if (purchases.length === 0) return;

  const headers = ["ID Compra", "Fecha", "Producto", "Cantidad", "Precio Costo", "Total"];
  
  const escape = (val: any) => {
    const str = String(val ?? "");
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = purchases.flatMap(purchase => {
    // Para el CSV, podemos optar por una fila por ítem o una fila por compra con los ítems concatenados.
    // Dado que el encabezado original era simple, vamos a concatenar los productos en una sola celda 
    // pero sumar sus cantidades y totales para la fila de la compra.
    const productsDetails = purchase.items
      ?.map((item: any) => `${item.productName} (x${item.quantity})`)
      .join(" | ") || "Sin productos";
    
    const totalQty = purchase.items?.reduce((acc: number, item: any) => acc + (item.quantity || 0), 0) || 0;

    return [[
      escape(purchase.id),
      escape(purchase.createdAt?.toDate ? purchase.createdAt.toDate().toLocaleString("es-CO") : new Date().toLocaleString("es-CO")),
      escape(productsDetails),
      totalQty,
      "-", // El precio costo es por ítem, no aplica a nivel de compra general si hay varios
      purchase.total
    ]];
  }).map(row => row[0]);

  const totalSpent = purchases.reduce((acc, p) => acc + (p.total || 0), 0);
  const totalItems = purchases.reduce((acc, p) => {
    const qty = p.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
    return acc + qty;
  }, 0);
  
  const summaryRow = [
    escape("RESUMEN"),
    "",
    escape("TOTAL GENERAL:"),
    totalItems,
    "",
    totalSpent
  ];

  const csvContent = [
    headers.map(escape).join(";"),
    ...rows.map(row => row.join(";")),
    summaryRow.join(";")
  ].join("\r\n");

  const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([BOM, csvContent], { type: "text/csv;charset=utf-8;" });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  const fileName = `reporte_compras_${filterName}_${new Date().toISOString().split('T')[0]}.csv`;
  
  link.href = url;
  link.setAttribute("download", fileName);
  link.download = fileName;
  
  document.body.appendChild(link);
  link.click();
  
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 1000);
};
