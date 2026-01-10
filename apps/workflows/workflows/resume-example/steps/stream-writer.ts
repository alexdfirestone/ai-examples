// Reusable stream writer step for sending updates to the client

export async function writeStreamUpdate(
  writable: WritableStream | undefined,
  update: { step: string; status: string; data?: any; timestamp: number }
): Promise<void> {
  "use step";
  
  if (!writable) return;
  
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const message = JSON.stringify(update) + "\n";
  await writer.write(encoder.encode(message));
  writer.releaseLock();
}

