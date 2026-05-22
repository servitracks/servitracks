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
  formato?: "57mm" | "80mm";
  notes?: string;
}

export function Ticket({ 
  invoiceId, ncf, createdAt, tenant, customer, items, 
  subtotal, itbis, total, payMethod, cashReceived, mechanicName, 
  formato = "80mm", notes 
}: TicketProps) {
  const w = formato === "57mm" ? "w-[58mm]" : "w-[80mm]";
  const cols = formato === "57mm" ? "max-w-[32ch]" : "max-w-[44ch]";

  const vuelto = cashReceived && cashReceived > total ? cashReceived - total : 0;

  // Generar URL para el QR de la DGII (e-CF)
  const isECF = ncf?.startsWith("E");
  const qrData = isECF ? `https://fc.dgii.gov.do/testecf/consultatimbrefc?rncemisor=${tenant.rnc}&encf=${ncf}&montototal=${total}` : "";

  let tipoDocumento = "COMPROBANTE FISCAL";
  if (!ncf) tipoDocumento = "RECIBO / CONDUCE";
  else if (ncf.startsWith('E31') || ncf.startsWith('B01')) tipoDocumento = "FACTURA PARA CRÉDITO FISCAL";
  else if (ncf.startsWith('E32') || ncf.startsWith('B02')) tipoDocumento = "FACTURA PARA CONSUMIDOR FINAL";
  else if (ncf.startsWith('E33') || ncf.startsWith('B03')) tipoDocumento = "NOTA DE DÉBITO";
  else if (ncf.startsWith('E34') || ncf.startsWith('B04')) tipoDocumento = "NOTA DE CRÉDITO";

  return (
    <div className={`thermal-ticket mx-auto ${w} ${cols} bg-white p-3 font-mono text-[11px] leading-snug text-black`} style={{ color: "#000" }}>
      <div className="text-center space-y-0.5 mb-2">
        {tenant.logo && (
          <div className="flex justify-center mb-1">
            <img src={tenant.logo} alt="Logo" className="h-16 w-auto max-w-[180px] object-contain filter grayscale contrast-125" />
          </div>
        )}
        <div className="text-[13px] font-bold uppercase leading-tight">{tenant.name || tenant.nombre}</div>
        {tenant.rnc && <div>RNC: {tenant.rnc}</div>}
        {(tenant.phone || tenant.telefono) && <div>Tel: {tenant.phone || tenant.telefono}</div>}
        {(tenant.address || tenant.direccion) && <div className="text-[10px] leading-tight">{tenant.address || tenant.direccion}</div>}
      </div>
      
      <div className="border-t border-dashed border-black my-1" />
      <div className="text-center font-bold uppercase text-[12px] py-1">{tipoDocumento}</div>
      <div className="border-t border-dashed border-black my-1" />
      
      <div>
        <div><b>FACTURA:</b> {invoiceId.slice(-6).toUpperCase()}</div>
        {ncf && <div><b>{isECF ? 'e-NCF' : 'NCF'}:</b> {ncf}</div>}
        <div><b>FECHA:</b> {new Date(createdAt).toLocaleString("es-DO")}</div>
      </div>
      
      {(!customer || customer.name === "Consumidor Final" || customer.name === "Walk-in") ? (
        <div className="border-t border-dashed border-black my-1" />
      ) : (
        <>
          <div className="border-t border-dashed border-black my-1" />
          <div className="text-center font-bold uppercase tracking-widest">Datos del Cliente</div>
          <div className="border-t border-dashed border-black my-1" />
          <div>
            <div><b>Cliente:</b> {customer.name}</div>
            {customer.documentId && <div><b>ID:</b> {customer.documentId}</div>}
            {customer.phone && <div><b>Teléfono:</b> {customer.phone}</div>}
          </div>
          <div className="border-t border-dashed border-black my-1" />
        </>
      )}

      <div className="flex justify-between font-bold uppercase text-[10px] mb-1">
        <div className="w-[50%]">DESCRIPCION</div>
        <div className="w-[20%] text-right">CANT</div>
        <div className="w-[30%] text-right">VALOR</div>
      </div>
      <div className="border-t border-dashed border-black my-1" />

      <div className="mt-1 mb-2">
        {items.map((it, i) => {
          let price = it.unitPrice || it.salePrice || 0;
          let qty = it.quantity || 1;
          let valor = qty * price;
          let name = it.name || it.descripcion;
          return (
            <div key={i} className="flex justify-between items-start mb-1.5">
              <div className="w-[50%] pr-1">
                <div className="font-medium leading-tight">{name}</div>
                <div className="text-[9px] text-black/70 leading-tight">RD$ {price.toLocaleString("es-DO")}</div>
              </div>
              <div className="w-[20%] text-right font-medium pt-0.5">{qty}</div>
              <div className="w-[30%] text-right font-medium pt-0.5">{valor.toLocaleString("es-DO")}</div>
            </div>
          )
        })}
      </div>

      <div className="border-t border-dashed border-black my-1" />
      <div>
        <Row k="Subtotal" v={formatRD(subtotal)} />
        {itbis > 0 && <Row k="ITBIS (18%)" v={formatRD(itbis)} />}
        <div className="my-1 border-t border-dashed border-black" />
        <Row k="TOTAL" v={formatRD(total)} bold />
      </div>

      <div className="border-t border-dashed border-black my-1" />
      <div>
        <Row k="Pago" v={{ cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", credit: "Crédito" }[payMethod] || payMethod} />
        {cashReceived !== undefined && cashReceived > 0 && payMethod === "cash" && <Row k="Recibido" v={formatRD(cashReceived)} />}
        {vuelto > 0 && <Row k="Cambio" v={formatRD(vuelto)} />}
      </div>

      <div className="border-t border-dashed border-black my-1" />
      {notes && (
        <div className="text-[10px] mt-1 mb-1 italic leading-tight">
          <b>Nota:</b> {notes}
        </div>
      )}
      
      {mechanicName && (
        <>
          <div className="text-center mt-1">Atendido por: <b>{mechanicName}</b></div>
          <div className="border-t border-dashed border-black my-1" />
        </>
      )}

      <div className="text-center mt-2">
        <div>¡Gracias por su visita!</div>
        <div className="text-[9px] mt-1">ServiTracks Software</div>
      </div>

      {isECF && qrData && (
        <div className="mt-4 flex flex-col items-center gap-1 border-t border-dashed border-black pt-4">
          <div className="text-[9px] font-bold uppercase text-center">
            Factura Electrónica
          </div>
          <div className="p-1 bg-white">
            <QRCodeSVG value={qrData} size={100} level="M" />
          </div>
          <div className="text-[8px] text-center leading-tight mt-1">
            Consulte su factura en dgii.gov.do
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold text-[12px]" : ""}`}>
      <span>{k}:</span>
      <span>{v}</span>
    </div>
  );
}
