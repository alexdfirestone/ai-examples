// Stream update step - sends progress updates to client

export async function streamWorkflowUpdates(
  writable: WritableStream,
  updates: Array<{ step: string; status: string; data?: any }>
) {
  "use step";
  
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  
  for (const update of updates) {
    const message = JSON.stringify({ 
      step: update.step, 
      status: update.status, 
      data: update.data, 
      timestamp: Date.now() 
    }) + "\n";
    await writer.write(encoder.encode(message));
  }
  
  writer.releaseLock();
}

