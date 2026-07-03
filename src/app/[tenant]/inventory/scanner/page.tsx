"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useParams } from "@/lib/next-compat";
import { useStore } from "@/store/useStore";
import { ArrowLeft, Barcode, CheckCircle2, AlertCircle, Save, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function InventoryScanner() {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params.tenant as string;

  const { products, updateProduct, addMovement, addInventorySession, currentUserId, tenants } = useStore();
  const currentTenant = tenants.find(t => t.slug === tenantSlug);
  const tenantId = currentTenant?.id || "";
  const [sessionName, setSessionName] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [actualQuantity, setActualQuantity] = useState<number | "">("");
  const [discrepancyNote, setDiscrepancyNote] = useState("");
  
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const tenantProducts = useMemo(() => products.filter(p => p.tenantId === tenantId && !p.isCombo), [products, tenantId]);

  const searchResults = useMemo(() => {
    if (!barcodeInput.trim()) return [];
    
    const normalize = (str: string) => (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const terms = normalize(barcodeInput).split(' ').filter(Boolean);
    
    return tenantProducts.filter(p => {
      const searchableStr = normalize(`${p.name} ${p.sku} ${p.barcode}`);
      return terms.every(term => searchableStr.includes(term));
    }).slice(0, 8); // Mostrar máximo 8 resultados
  }, [barcodeInput, tenantProducts]);

  useEffect(() => {
    // Generar nombre automático para la sesión
    const now = new Date();
    setSessionName(`Inventario Físico - ${now.toLocaleDateString()}`);
    // Auto enfocar el input del escáner
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleSelectProduct = (product: any) => {
    setCurrentProduct(product);
    setActualQuantity("");
    setDiscrepancyNote("");
    setShowDropdown(false);
    setBarcodeInput("");
    toast.success(`Producto seleccionado: ${product.name}`);
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    // Primero intentar coincidencia exacta por SKU o Código de barras
    let product = tenantProducts.find(p => p.barcode === barcodeInput.trim() || p.sku === barcodeInput.trim());
    
    // Si no hay exacta, pero hay resultados de búsqueda, tomar el primero
    if (!product && searchResults.length > 0) {
      product = searchResults[0];
    }
    
    if (product) {
      handleSelectProduct(product);
    } else {
      toast.error("Producto no encontrado en la base de datos");
      setCurrentProduct(null);
      setShowDropdown(false);
    }
  };

  const handleConfirmQuantity = () => {
    if (!currentProduct || actualQuantity === "") return;

    const expected = currentProduct.stock;
    const actual = Number(actualQuantity);
    const diff = actual - expected;

    if (diff !== 0 && !discrepancyNote.trim()) {
      toast.error("Debe agregar una nota/justificación para la discrepancia.");
      return;
    }

    const newItem = {
      productId: currentProduct.id,
      productName: currentProduct.name,
      expectedQuantity: expected,
      actualQuantity: actual,
      difference: diff,
      notes: discrepancyNote.trim() || undefined,
    };

    setScannedItems(prev => {
      // Reemplazar si ya se había escaneado
      const exists = prev.findIndex(i => i.productId === currentProduct.id);
      if (exists !== -1) {
        const updated = [...prev];
        updated[exists] = newItem;
        return updated;
      }
      return [newItem, ...prev];
    });

    toast.success("Cantidad registrada correctamente.");
    setCurrentProduct(null);
    setActualQuantity("");
    setDiscrepancyNote("");
    
    // Devolver el foco al escáner
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 100);
  };

  const handleSaveSession = () => {
    if (scannedItems.length === 0) {
      toast.error("No hay artículos escaneados.");
      return;
    }

    addInventorySession({
      id: Math.random().toString(36).substr(2, 9),
      tenantId,
      name: sessionName,
      status: 'cerrado',
      auditorId: currentUserId || undefined,
      discrepancies: scannedItems,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });

    // Procesar las discrepancias para actualizar el inventario y generar movimientos
    scannedItems.forEach(item => {
      if (item.difference !== 0) {
        // Actualizar el stock
        updateProduct(item.productId, { stock: item.actualQuantity });
        
        // Crear movimiento de ajuste
        addMovement({
          id: Math.random().toString(36).substr(2, 9),
          tenantId,
          productId: item.productId,
          productName: item.productName,
          type: item.difference > 0 ? "in" : "out",
          quantity: Math.abs(item.difference),
          reason: `Ajuste por Pase de Inventario: ${sessionName}. ${item.notes || ''}`.trim(),
          date: new Date().toISOString(),
          userId: currentUserId || undefined,
        });
      }
    });

    toast.success("Sesión de inventario guardada exitosamente");
    router.push(`/${tenantSlug}/movimientos`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Topbar Minimalista */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => router.push(`/${tenantSlug}/movimientos`)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Pase de Inventario</h1>
            <input 
              type="text" 
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="text-sm text-gray-500 bg-transparent border-none p-0 focus:ring-0"
            />
          </div>
        </div>
        <button
          onClick={handleSaveSession}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Save className="w-5 h-5" />
          <span>Guardar Sesión</span>
        </button>
      </div>

      <div className="flex-1 flex p-6 gap-6 max-w-7xl mx-auto w-full">
        {/* Lado Izquierdo: Escáner y Validación */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Zona de Escaneo */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Escanea el Código de Barras o SKU</label>
            <form onSubmit={handleBarcodeSubmit} className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Barcode className="h-6 w-6 text-gray-400" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => {
                  setBarcodeInput(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="block w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 text-lg transition-colors"
                placeholder="Esperando escáner o escribe para buscar..."
                autoFocus
              />
              {/* Dropdown de Resultados de Búsqueda */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                  <ul className="py-2">
                    {searchResults.map((product) => (
                      <li key={product.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectProduct(product)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 flex justify-between items-center"
                        >
                          <div>
                            <p className="font-bold text-gray-900">{product.name}</p>
                            <p className="text-xs text-gray-500 font-mono">
                              {product.sku} {product.barcode ? `| ${product.barcode}` : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-gray-500 block mb-0.5">Stock</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {product.stock}
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </form>
          </div>

          {/* Click away listener para cerrar dropdown */}
          {showDropdown && (
            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)}></div>
          )}

          {/* Zona de Validación */}
          {currentProduct && (
            <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-colors duration-300 ${
              actualQuantity !== "" 
                ? (Number(actualQuantity) === currentProduct.stock ? 'border-green-500 ring-1 ring-green-500' : 'border-red-500 ring-1 ring-red-500') 
                : 'border-blue-200'
            }`}>
              <div className={`p-4 border-b ${
                actualQuantity !== "" 
                  ? (Number(actualQuantity) === currentProduct.stock ? 'bg-green-50' : 'bg-red-50') 
                  : 'bg-blue-50'
              }`}>
                <h2 className="text-xl font-bold text-gray-900">{currentProduct.name}</h2>
                <p className="text-sm text-gray-500">SKU: {currentProduct.sku} {currentProduct.barcode && `| Código: ${currentProduct.barcode}`}</p>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl">
                  <span className="text-gray-600 font-medium">Existencia en Sistema:</span>
                  <span className="text-2xl font-bold text-gray-900">{currentProduct.stock}</span>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Cantidad Física Encontrada</label>
                  <input
                    type="number"
                    value={actualQuantity}
                    onChange={(e) => setActualQuantity(e.target.value)}
                    className={`block w-full text-center text-4xl py-4 border-2 rounded-xl focus:ring-0 transition-colors ${
                      actualQuantity !== "" 
                        ? (Number(actualQuantity) === currentProduct.stock ? 'border-green-500 text-green-700 bg-green-50' : 'border-red-500 text-red-700 bg-red-50') 
                        : 'border-gray-300 focus:border-blue-500'
                    }`}
                    placeholder="0"
                    min="0"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmQuantity();
                    }}
                  />
                </div>

                {/* Área de Discrepancia */}
                {actualQuantity !== "" && Number(actualQuantity) !== currentProduct.stock && (
                  <div className="space-y-2 animate-fade-in">
                    <label className="flex items-center text-red-600 font-medium text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Discrepancia detectada ({Number(actualQuantity) - currentProduct.stock > 0 ? '+' : ''}{Number(actualQuantity) - currentProduct.stock}). Justificación obligatoria:
                    </label>
                    <textarea
                      value={discrepancyNote}
                      onChange={(e) => setDiscrepancyNote(e.target.value)}
                      className="w-full border-red-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500"
                      rows={2}
                      placeholder="Ej. Mercancía dañada, no se registró entrada previa..."
                    />
                  </div>
                )}

                <div className="flex gap-4 pt-4 border-t">
                  <button
                    onClick={() => {
                      setCurrentProduct(null);
                      setActualQuantity("");
                      setTimeout(() => inputRef.current?.focus(), 100);
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmQuantity}
                    disabled={actualQuantity === "" || (Number(actualQuantity) !== currentProduct.stock && !discrepancyNote.trim())}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lado Derecho: Resumen de Escaneos */}
        <div className="w-96 bg-white rounded-2xl shadow-sm border flex flex-col h-full max-h-[calc(100vh-120px)]">
          <div className="p-4 border-b bg-gray-50 rounded-t-2xl">
            <h3 className="font-bold text-gray-900">Artículos Auditados</h3>
            <p className="text-sm text-gray-500">{scannedItems.length} registrados en esta sesión</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {scannedItems.length === 0 ? (
              <div className="text-center text-gray-500 mt-10">
                <Barcode className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>Comienza a escanear productos para llenar la lista.</p>
              </div>
            ) : (
              scannedItems.map((item, idx) => (
                <div key={idx} className={`p-3 rounded-xl border ${item.difference === 0 ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-gray-900 truncate pr-2">{item.productName}</span>
                    {item.difference === 0 ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Sistema: {item.expectedQuantity}</span>
                    <span className={`font-semibold ${item.difference === 0 ? 'text-green-700' : 'text-red-700'}`}>
                      Físico: {item.actualQuantity}
                    </span>
                  </div>
                  {item.notes && (
                    <p className="text-xs text-red-600 mt-2 bg-white/50 p-1 rounded italic">{item.notes}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
