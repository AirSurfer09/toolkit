import * as util from 'util';

class Queue<T> {
    private queue: T[] = [];
    async put(item : T){
        this.queue.push(item);
    }
    async get(): Promise<T>{
        return this.queue.shift();
    }
}
const promisifiedGetAudioData = async (audioU8 :any) => {return   util.promisify(audioU8)};
const promisifiedGetVisemeChunk = async (visemeU8 :any) => {return  util.promisify(visemeU8)};


async function producer(queue: any, audioU8: any, visemeU8: any) {
  while (true) {
    const audioData = await promisifiedGetAudioData(audioU8);
    const visemeChunk = await promisifiedGetVisemeChunk(visemeU8);

    if (!audioData || !visemeChunk) {
      break;
    }

    await queue.put([audioData, visemeChunk]);
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulated delay, adjust as needed
  }

  await queue.put(null); // Signal the consumer that there's no more data
}

async function consumer(queue: any) {
  while (true) {
    const data = await queue.get();

    if (data === null) {
      break; // Exit the loop when signaled that there's no more data
    }

    const [audioData, visemeChunk] = data;
    return data;
    // playAudio(audioData);
    // processViseme(visemeChunk);
  }
}

export {producer,consumer,Queue}