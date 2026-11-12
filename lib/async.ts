/** Bound waiting for a platform response; always remove the timeout timer. */
export async function withTimeout<T>(operation: Promise<T>, milliseconds: number, message = 'The platform did not respond in time. Please try again.'): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(message)), milliseconds); }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
