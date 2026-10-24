import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const EF2_BASE_URL = "https://master.ef2.do/api2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-ef2-token, x-ef2-path, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

/**
 * Supabase Edge Function Proxy para EF2 (https://master.ef2.do/api2)
 * Soluciona el problema de CORS de EF2 (que envía Access-Control-Allow-Origin: "*, *" duplicado)
 * cuando la aplicación se aloja en Coolify o cualquier servidor fuera de Vite dev.
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // Extraer el path destino hacia EF2:
    // Soporta tanto /functions/v1/ef2-proxy/invoice como ?ef2_path=/invoice o header x-ef2-path
    let targetPath =
      req.headers.get("x-ef2-path") ||
      url.searchParams.get("ef2_path") ||
      url.pathname.replace(/^\/?(?:functions\/v1\/)?ef2-proxy/, "");

    if (!targetPath || targetPath === "/") {
      targetPath = "/invoice";
    }
    if (!targetPath.startsWith("/")) {
      targetPath = `/${targetPath}`;
    }

    // Conservar query params originales (excepto ef2_path si se usó como ruteador)
    const forwardParams = new URLSearchParams(url.searchParams);
    forwardParams.delete("ef2_path");
    const queryString = forwardParams.toString();
    const hasQueryInTarget = targetPath.includes("?");
    const fullTargetUrl = `${EF2_BASE_URL}${targetPath}${
      queryString ? (hasQueryInTarget ? `&${queryString}` : `?${queryString}`) : ""
    }`;

    // Token de EF2: prioriza x-ef2-token para no chocar con el JWT de Supabase
    const ef2Token = req.headers.get("x-ef2-token");
    const authHeader = ef2Token
      ? `Bearer ${ef2Token.replace(/^Bearer\s+/i, "").trim()}`
      : req.headers.get("authorization") || "";

    const forwardHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (authHeader) {
      forwardHeaders["Authorization"] = authHeader;
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers: forwardHeaders,
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      const rawBody = await req.text();
      if (rawBody) {
        fetchOptions.body = rawBody;
      }
    }

    const ef2Response = await fetch(fullTargetUrl, fetchOptions);
    const responseText = await ef2Response.text();

    return new Response(responseText, {
      status: ef2Response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        message: `Error en ef2-proxy: ${error?.message || "Error inesperado"}`,
      }),
      {
        status: 502,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8",
        },
      }
    );
  }
});
