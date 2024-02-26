// Source: https://stackoverflow.com/a/47157577.

/**
 * A queue that allows asynchronous enqueue and dequeue operations, and blocks when there are no values to dequeue.
 * @template T The type of values stored in the queue.
 */
class AsyncBlockingQueue<T> {
  private resolvers: Array<((value: T) => void)> = [];
  private promises: Promise<T>[] = [];

  // This function asynchronously adds a new promise to the queue
  private async _add(): Promise<void> {
    const promise = new Promise<T>(resolve => {
      this.resolvers.push(resolve);
    });

    this.promises.push(promise);

    // Wait for all promises to be resolved
    await Promise.all(this.promises);
  }

  // Enqueue a value into the queue
  public enqueue(value: T): void {
    // If there are no pending resolvers, add a new promise
    if (!this.resolvers.length) {
      this._add();
    }
    // Resolve the first resolver with the provided value
    this.resolvers.shift()(value);
  }

  // Dequeue a value from the queue
  public async dequeue(): Promise<T> {
    // If there are no pending promises, add a new promise
    if (!this.promises.length) {
      this._add();
    }
    // Wait for the first promise to be resolved and return its value
    const result = await Promise.all([this.promises.shift()]);
    return result[0];
  }

  // Check if the queue is empty
  public isEmpty(): boolean {
    return this.promises.length === 0;
  }

  // Check if the queue is waiting for values
  public isBlocked(): boolean {
    return this.resolvers.length > 0;
  }

  // Get the number of pending promises in the queue
  public get length(): number {
    return this.promises.length - this.resolvers.length;
  }

  // Implement an asynchronous iterator for the queue
  async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
    while (true) {
      const value = await this.dequeue();
      yield value;
    }
  }
}

export { AsyncBlockingQueue };