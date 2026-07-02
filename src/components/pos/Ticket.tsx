import { QRCodeSVG } from "qrcode.react";

export function formatRD(amount: number) {
  return `RD$ ${amount.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface TicketProps {
  invoiceId: string;
  ncf?: string;
  createdAt: string;
  tenant: any; // taller
  customer?: any;
  items: any[];
  subtotal: number;
  itbis: number;
  total: number;
  payMethod: string;
  cashReceived?: number;
  mechanicName?: string;
  formato?: "57mm" | "58mm" | "80mm" | "A4";
  notes?: string;
  warrantyText?: string;
  qrUrl?: string;
  securityCode?: string;
  signatureDate?: string;
}

export function Ticket({ 
  invoiceId, ncf, createdAt, tenant, customer, items, 
  subtotal, itbis, total, payMethod, cashReceived, mechanicName, 
  formato = "80mm", notes, warrantyText, qrUrl, securityCode, signatureDate
}: TicketProps) {
  // Manejar 57mm y 58mm como el mismo formato
  const formatKey = formato === "57mm" ? "58mm" : formato;
  
  const w = formatKey === "58mm" ? "w-[58mm]" : formatKey === "A4" ? "w-[210mm] min-h-[297mm]" : "w-[80mm]";
  const cols = formatKey === "58mm" ? "max-w-[32ch]" : formatKey === "A4" ? "max-w-none" : "max-w-[44ch]";

  const vuelto = cashReceived && cashReceived > total ? cashReceived - total : 0;

  // Generar URL para el QR de la DGII (e-CF)
  const isECF = ncf?.startsWith("E");
  const qrData = qrUrl || (isECF ? `https://fc.dgii.gov.do/testecf/consultatimbrefc?rncemisor=${tenant.rnc}&encf=${ncf}&montototal=${total}` : "");

  let tipoDocumento = "COMPROBANTE FISCAL";
  if (!ncf) tipoDocumento = "RECIBO / CONDUCE";
  else if (ncf.startsWith('E31') || ncf.startsWith('B01')) tipoDocumento = "FACTURA PARA CRÉDITO FISCAL";
  else if (ncf.startsWith('E32') || ncf.startsWith('B02')) tipoDocumento = "FACTURA PARA CONSUMIDOR FINAL";
  else if (ncf.startsWith('E33') || ncf.startsWith('B03')) tipoDocumento = "NOTA DE DÉBITO";
  else if (ncf.startsWith('E34') || ncf.startsWith('B04')) tipoDocumento = "NOTA DE CRÉDITO";

  // --- Diseño A4 Moderno y Profesional ---
  if (formatKey === "A4") {
    return (
      <div className={`thermal-ticket mx-auto ${w} bg-white p-12 font-sans text-neutral-800 text-sm`}>
        {/* Header A4 */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-neutral-100">
          <div className="flex gap-6 items-center">
            {tenant.logo ? (
              <img src={tenant.logo} alt="Logo" className="h-24 w-auto object-contain" />
            ) : (
              <div className="h-24 w-24 bg-neutral-100 rounded-xl flex items-center justify-center font-black text-2xl text-neutral-400">
                {tenant.name?.charAt(0) || "T"}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-black text-black tracking-tight uppercase">{tenant.name || tenant.nombre}</h1>
              <div className="text-neutral-500 mt-1">
                {tenant.rnc && <div><span className="font-semibold text-neutral-700">RNC:</span> {tenant.rnc}</div>}
                {(tenant.phone || tenant.telefono) && <div><span className="font-semibold text-neutral-700">Tel:</span> {tenant.phone || tenant.telefono}</div>}
                {(tenant.address || tenant.direccion) && <div>{tenant.address || tenant.direccion}</div>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-black text-black uppercase">{tipoDocumento}</h2>
            <div className="mt-2 text-neutral-600">
              <div className="text-lg"><b>#{invoiceId.slice(-6).toUpperCase()}</b></div>
              {ncf && <div className="mt-1"><span className="font-bold text-neutral-800">{isECF ? 'e-NCF' : 'NCF'}:</span> {ncf}</div>}
              <div className="mt-1"><span className="font-bold text-neutral-800">Fecha:</span> {new Date(createdAt).toLocaleDateString("es-DO", { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>
        </div>

        {/* Info Cliente & Atencion A4 */}
        <div className="flex justify-between mb-8 bg-neutral-50 p-6 rounded-2xl border border-neutral-100">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Facturado a</h3>
            {(!customer || (!customer.name && !customer.rnc) || customer.name === "Consumidor Final" || customer.name === "Walk-in") ? (
              <div className="font-bold text-lg text-black">Consumidor Final</div>
            ) : (
              <div className="text-neutral-700">
                <div className="font-bold text-lg text-black">{customer.name}</div>
                {(customer.rnc || customer.documentId) && <div className="mt-1">RNC / Doc: {customer.rnc || customer.documentId}</div>}
                {customer.phone && <div>Teléfono: {customer.phone}</div>}
                {customer.address && <div>Dirección: {customer.address}</div>}
              </div>
            )}
          </div>
          <div className="text-right">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Detalles de Operación</h3>
            <div className="text-neutral-700">
              <div><span className="font-semibold">Atendido por:</span> {mechanicName || "Administración"}</div>
              <div className="mt-1"><span className="font-semibold">Método de pago:</span> {{ cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", credit: "Crédito" }[payMethod] || payMethod}</div>
              {cashReceived !== undefined && cashReceived > 0 && payMethod === "cash" && (
                <div className="mt-1"><span className="font-semibold">Recibido:</span> {formatRD(cashReceived)}</div>
              )}
            </div>
          </div>
        </div>

        {/* Tabla Items A4 */}
        <div className="mb-8 rounded-2xl overflow-hidden border border-neutral-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-100 text-neutral-600 text-xs uppercase tracking-widest">
                <th className="py-4 px-6 font-bold">Descripción</th>
                <th className="py-4 px-6 font-bold text-center">Cant.</th>
                <th className="py-4 px-6 font-bold text-right">Precio Unit.</th>
                <th className="py-4 px-6 font-bold text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {items.map((it, i) => {
                let price = it.unitPrice || it.salePrice || 0;
                let qty = it.quantity || 1;
                let valor = qty * price;
                let name = it.name || it.descripcion;
                return (
                  <tr key={i} className="bg-white">
                    <td className="py-4 px-6 font-medium text-black">{name}</td>
                    <td className="py-4 px-6 text-center text-neutral-600">{qty}</td>
                    <td className="py-4 px-6 text-right text-neutral-600">{formatRD(price)}</td>
                    <td className="py-4 px-6 text-right font-bold text-black">{formatRD(valor)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totales y QR A4 */}
        <div className="flex justify-between items-start mt-8">
          <div className="w-1/2 pr-8 space-y-6">
            {notes && (
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Notas</h3>
                <p className="text-sm text-neutral-600 italic bg-amber-50 p-4 rounded-xl border border-amber-100">{notes}</p>
              </div>
            )}
            
            {warrantyText && (
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Garantía</h3>
                <p className="text-sm text-emerald-800 bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-start gap-2">
                  <span className="text-lg leading-none">&#x1F6E1;</span> {warrantyText}
                </p>
              </div>
            )}

            {isECF && qrData && (
              <div className="flex gap-4 items-center bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                <div className="p-2 bg-white rounded-lg border border-neutral-100 shadow-sm shrink-0">
                  <QRCodeSVG value={qrData} size={80} level="M" />
                </div>
                <div className="text-xs text-neutral-600">
                  <div className="font-black text-black uppercase mb-1">Factura de Consumo Electrónica</div>
                  {securityCode && <div><span className="font-bold">Código de Seg:</span> {securityCode}</div>}
                  <div><span className="font-bold">Firma:</span> {new Date(signatureDate || createdAt).toLocaleString("es-DO")}</div>
                  <div className="mt-1">Consulte en: <span className="font-bold">dgii.gov.do</span></div>
                </div>
              </div>
            )}
          </div>
          
          <div className="w-[400px] bg-neutral-50 p-6 rounded-2xl border border-neutral-200">
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span className="font-medium text-black">{formatRD(subtotal)}</span>
              </div>
              {itbis > 0 && (
                <div className="flex justify-between text-neutral-600">
                  <span>ITBIS (18%)</span>
                  <span className="font-medium text-black">{formatRD(itbis)}</span>
                </div>
              )}
            </div>
            <div className="pt-4 border-t-2 border-neutral-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-black uppercase">Total</span>
                <span className="text-2xl font-black text-black">{formatRD(total)}</span>
              </div>
            </div>
            {vuelto > 0 && (
              <div className="mt-4 pt-4 border-t border-dashed border-neutral-300 flex justify-between text-emerald-600 font-bold">
                <span>Su Cambio</span>
                <span>{formatRD(vuelto)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-neutral-200 text-center text-neutral-400 text-sm font-medium">
          ¡Gracias por su visita!
        </div>
      </div>
    );
  }

  // --- Diseño Térmico (58mm / 80mm) Moderno ---
  return (
    <div className={`thermal-ticket mx-auto ${w} ${cols} bg-white p-3 font-sans text-[11px] leading-snug text-neutral-900`} style={{ color: "#171717" }}>
      <div className="text-center space-y-1 mb-3">
        {tenant.logo && (
          <div className="flex justify-center mb-2">
            <img src={tenant.logo} alt="Logo" className="h-14 w-auto max-w-[160px] object-contain filter grayscale contrast-125" />
          </div>
        )}
        <div className="text-[14px] font-black uppercase tracking-tight">{tenant.name || tenant.nombre}</div>
        {tenant.rnc && <div className="text-[10px] text-neutral-600">RNC: {tenant.rnc}</div>}
        {(tenant.phone || tenant.telefono) && <div className="text-[10px] text-neutral-600">Tel: {tenant.phone || tenant.telefono}</div>}
        {(tenant.address || tenant.direccion) && <div className="text-[9px] text-neutral-500 leading-tight">{tenant.address || tenant.direccion}</div>}
      </div>
      
      <div className="border-t-[1.5px] border-neutral-300 my-2" />
      <div className="text-center font-black uppercase tracking-wider text-[11px] py-0.5">{tipoDocumento}</div>
      <div className="border-t-[1.5px] border-neutral-300 my-2" />
      
      <div className="text-[10px] space-y-0.5">
        <div className="flex justify-between">
          <span className="text-neutral-500">FACTURA:</span>
          <span className="font-bold">{invoiceId.slice(-6).toUpperCase()}</span>
        </div>
        {ncf && (
          <div className="flex justify-between">
            <span className="text-neutral-500">{isECF ? 'e-NCF' : 'NCF'}:</span>
            <span className="font-bold">{ncf}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-neutral-500">FECHA:</span>
          <span className="font-bold">{new Date(createdAt).toLocaleString("es-DO", { dateStyle: "short", timeStyle: "short" })}</span>
        </div>
      </div>
      
      {(!customer || (!customer.name && !customer.rnc) || customer.name === "Consumidor Final" || customer.name === "Walk-in") ? (
        <div className="border-t border-dashed border-neutral-300 my-2" />
      ) : (
        <>
          <div className="border-t-[1.5px] border-neutral-300 my-2" />
          <div className="text-center font-bold uppercase tracking-widest text-[9px] py-0.5 text-neutral-500">CLIENTE</div>
          <div className="border-t-[1.5px] border-neutral-300 my-2" />
          <div className="text-[10px] space-y-0.5">
            {customer.name && <div className="font-bold">{customer.name}</div>}
            {(customer.rnc || customer.documentId) && <div className="text-neutral-600">RNC: {customer.rnc || customer.documentId}</div>}
            {customer.phone && <div className="text-neutral-600">Tel: {customer.phone}</div>}
          </div>
          <div className="border-t border-dashed border-neutral-300 my-2" />
        </>
      )}

      <div className="flex justify-between font-bold uppercase text-[9px] mb-1.5 text-neutral-500 tracking-wider">
        <div className="w-[50%]">ARTÍCULO</div>
        <div className="w-[15%] text-right">CT</div>
        <div className="w-[35%] text-right">TOTAL</div>
      </div>
      <div className="border-t border-neutral-300 my-1" />

      <div className="mt-1.5 mb-2.5 space-y-1.5">
        {items.map((it, i) => {
          let price = it.unitPrice || it.salePrice || 0;
          let qty = it.quantity || 1;
          let valor = qty * price;
          let name = it.name || it.descripcion;
          return (
            <div key={i} className="flex justify-between items-start">
              <div className="w-[50%] pr-1">
                <div className="font-semibold leading-tight text-[10px]">{name}</div>
                <div className="text-[8px] text-neutral-500 leading-tight">RD$ {price.toLocaleString("es-DO")} c/u</div>
              </div>
              <div className="w-[15%] text-right font-medium text-[10px]">{qty}</div>
              <div className="w-[35%] text-right font-bold text-[10px]">{valor.toLocaleString("es-DO")}</div>
            </div>
          )
        })}
      </div>

      <div className="border-t border-neutral-300 my-1" />
      <div className="space-y-0.5 mt-1">
        <Row k="Subtotal" v={formatRD(subtotal)} />
        {itbis > 0 && <Row k="ITBIS (18%)" v={formatRD(itbis)} />}
        <div className="my-1 border-t-[1.5px] border-neutral-300" />
        <div className="flex justify-between items-center">
          <span className="font-black uppercase tracking-wider text-[11px]">TOTAL</span>
          <span className="font-black text-[13px]">{formatRD(total)}</span>
        </div>
      </div>

      <div className="border-t-[1.5px] border-neutral-300 my-2" />
      <div className="space-y-0.5 text-[10px]">
        <Row k="Pago" v={{ cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", credit: "Crédito" }[payMethod] || payMethod} />
        {cashReceived !== undefined && cashReceived > 0 && payMethod === "cash" && <Row k="Recibido" v={formatRD(cashReceived)} />}
        {vuelto > 0 && <Row k="Cambio" v={formatRD(vuelto)} bold />}
      </div>

      <div className="border-t border-dashed border-neutral-300 my-2" />
      {notes && (
        <div className="text-[9px] mt-1 mb-2 italic leading-tight text-neutral-600">
          <span className="font-bold not-italic">Nota:</span> {notes}
        </div>
      )}
      
      {mechanicName && (
        <>
          <div className="text-center mt-2 text-[10px] text-neutral-600">Atendido por: <b className="text-neutral-900">{mechanicName}</b></div>
          <div className="border-t border-dashed border-neutral-300 my-2" />
        </>
      )}

      {warrantyText && (
        <>
          <div className="text-[9px] mt-1.5 mb-1.5 leading-snug text-center px-1 text-neutral-700">
            <span className="font-bold">&#x1F6E1; </span>
            <span className="italic">{warrantyText}</span>
          </div>
          <div className="border-t border-dashed border-neutral-300 my-2" />
        </>
      )}

      <div className="text-center mt-3 text-[10px] font-medium tracking-wide">
        ¡Gracias por su visita!
      </div>

      {isECF && qrData && (
        <div className="mt-4 flex flex-col items-center gap-1 border-t border-dashed border-neutral-300 pt-3">
          <div className="text-[8px] font-bold uppercase text-center tracking-widest text-neutral-500">
            Factura de Consumo Electrónica
          </div>
          <div className="p-1 bg-white my-1 rounded">
            <QRCodeSVG value={qrData} size={90} level="M" />
          </div>
          {securityCode && (
            <div className="text-[8px] text-center mt-1 text-neutral-600 font-medium">
              <div>Cód. Seguridad: <span className="font-bold text-neutral-900">{securityCode}</span></div>
              {signatureDate && <div>Firma: {new Date(signatureDate).toLocaleString("es-DO", { dateStyle: "short", timeStyle: "short" })}</div>}
              {!signatureDate && <div>Firma: {new Date(createdAt).toLocaleString("es-DO", { dateStyle: "short", timeStyle: "short" })}</div>}
            </div>
          )}
          <div className="text-[8px] text-center mt-1 text-neutral-500">
            Consulte su factura en:<br /><span className="font-bold text-neutral-900">dgii.gov.do</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between items-center ${bold ? "font-bold text-[11px]" : ""}`}>
      <span className={bold ? "" : "text-neutral-600"}>{k}:</span>
      <span className={bold ? "text-[12px]" : ""}>{v}</span>
    </div>
  );
}
