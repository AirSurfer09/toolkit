import { grpc } from '@improbable-eng/grpc-web';
import { ConvaiService } from '../../Proto/service/service_pb_service';
import {
  GetResponseRequest,
  GetResponseResponse,
  AudioConfig,
  ActionConfig,
} from '../../Proto/service/service_pb';

const GRPC_HOST = 'https://webstream.convai.com';
// const GRPC_HOST = "https://convai-middleman-grpc-web-temp-mhf27w7osa-vp.a.run.app"
const SOURCE_TAG = 'Web3D';
const METADATA = new grpc.Metadata();
METADATA.set('source', SOURCE_TAG);

/**
 * Represents a gRPC client for the ConvaiService.
 * @class
 */
export class ConvaiGRPCClient {
  /**
   * Creates an instance of ConvaiGRPCClient.
   * @constructor
   * @param {string} apiKey - The API key for the ConvaiService.
   * @param {string} characterId - The ID of the character.
   * @param {string} sessionId - The ID of the session.
   * @param {(response: GetResponseResponse) => void} responseCallback - The callback function to handle the response.
   * @param {string} languageCode - The language code for the conversation.
   * @param {boolean} disableAudioGeneration - Whether to disable audio generation.
   * @param {ActionConfig} actionConfig - This will contain the custom actions object (Config)
   * @param {boolean} enableFacialData - Whether to enable facial data.
   * @param {boolean} enableEmotionalData - Whether to enable facial emotions data.
   * @param {0|1|2|3} faceModel - The face model to use.
   */
  private client: grpc.Client<GetResponseRequest, GetResponseResponse>;
  private apiKey: string;
  private languageCode: string;
  private sessionId: string;
  private characterId: string;
  private disableAudioGeneration?: boolean;
  private actionConfig?: ActionConfig;
  private inputMode: string;
  private isStarted: boolean;
  private enableFacialData: boolean;
  private enableEmotionalData: boolean;
  private faceModel: 0 | 1 | 2 | 3;
  constructor(
    apiKey: string,
    characterId: string,
    sessionId: string,
    responseCallback: (response: GetResponseResponse) => void,
    languageCode: string,
    disableAudioGeneration: boolean,
    actionConfig: ActionConfig,
    enableFacialData: boolean,
    enableEmotionalData: boolean,
    faceModel: 0 | 1 | 2 | 3
  ) {
    this.apiKey = apiKey;
    this.characterId = characterId;
    this.sessionId = sessionId;
    this.languageCode = languageCode;
    this.disableAudioGeneration = disableAudioGeneration;
    this.enableFacialData = enableFacialData;
    // this.enableEmotionalData = enableEmotionalData;
    this.faceModel = faceModel;
    this.actionConfig = actionConfig;
    // console.log("Emotional Data",enableEmotionalData)
    this.client = grpc.client(ConvaiService.GetResponse, {
      host: GRPC_HOST,
      transport: grpc.WebsocketTransport(),
    });
    this.client.onMessage((response: GetResponseResponse) => {
      responseCallback(response);
    });
    this.client.onEnd(
      (status: grpc.Code, statusMessage: string, trailers: grpc.Metadata) => {
        if (status != grpc.Code.OK) {
          console.log('GetResponse Failed: ', status, statusMessage);
        }
      }
    );
  }

  /**
   * Sends text to the ConvaiService.
   * @param {string} text - The text to send.
   */
  public sendText(text: string) {
    if (this.inputMode == 'audio') {
      console.log('Error: Cannot send text in audio input mode.');
      return;
    }
    this.inputMode = 'text';
    if (!this.isStarted) {
      this.start();
    }
    var req = new GetResponseRequest();
    var getResponseData = new GetResponseRequest.GetResponseData();
    getResponseData.setTextData(text);
    req.setGetResponseData(getResponseData);
    this.client?.send(req);
    this.client?.finishSend();
  }
  /**
   * Sends an audio chunk to the ConvaiService.
   * @param {ArrayBuffer} chunk - The audio chunk to send.
   */
  public sendAudioChunk(chunk: ArrayBuffer) {
    if (this.inputMode == 'text') {
      console.log('Error: Cannot send audio in text input mode.');
      return;
    }
    this.inputMode = 'audio';
    if (!this.isStarted) {
      this.start();
    }
    var req = new GetResponseRequest();
    var getResponseData = new GetResponseRequest.GetResponseData();
    getResponseData.setAudioData(new Uint8Array(chunk));
    req.setGetResponseData(getResponseData);
    this.client.send(req);
  }
  /**
   * Finishes sending data to the ConvaiService.
   */
  public finishSend() {
    this.client?.finishSend();
  }
  private start() {
    this.client.start(METADATA);
    var firstReq = new GetResponseRequest();
    var getResponseConfig = new GetResponseRequest.GetResponseConfig();
    getResponseConfig.setApiKey(this.apiKey);
    getResponseConfig.setCharacterId(this.characterId);
    getResponseConfig.setSessionId(this.sessionId);
    getResponseConfig.setLanguageCode(this.languageCode);

    var audioConfig = new AudioConfig();
    audioConfig.setSampleRateHertz(44100);
    audioConfig.setEnableFacialData(this.enableFacialData);
    // audioConfig.setEnableFacialEmotionData(this.enableEmotionalData)
    if (this.disableAudioGeneration)
      audioConfig.setDisableAudio(this.disableAudioGeneration);
    else {
      audioConfig.setDisableAudio(false);
    }
    audioConfig.setFaceModel(this.faceModel);
    getResponseConfig.setAudioConfig(audioConfig);

    // var actionConfig = new ActionConfig();
    getResponseConfig.setActionConfig(this.actionConfig);

    firstReq.setGetResponseConfig(getResponseConfig);
    this.client.send(firstReq);
    this.isStarted = true;
  }
  /**
   * Closes the gRPC client connection.
   */
  public closeConnection() {
    this.client.close();
    this.isStarted = false;
  }
}
