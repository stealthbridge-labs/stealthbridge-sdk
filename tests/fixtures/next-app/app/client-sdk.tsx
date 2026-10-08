"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  StealthBridgeClient,
  createBrowserBridgeClient,
  type Capabilities
} from "@stealthbridge/sdk";

export function ClientSdkCheck() {
  const [result, setResult] = useState(
    () => `client-import-ok:${ApiError.name}:${StealthBridgeClient.name}`
  );

  useEffect(() => {
    const controller = new AbortController();
    const client = createBrowserBridgeClient();
    client
      .capabilities({ signal: controller.signal })
      .then((caps: Capabilities) => {
        setResult((prev) => `${prev}:caps-ok:${caps.payments_enabled}`);
      })
      .catch(() => {
        // Expected offline in Next.js fixture build
      });
    return () => {
      controller.abort();
    };
  }, []);

  return <p data-sdk-client>{result}</p>;
}
