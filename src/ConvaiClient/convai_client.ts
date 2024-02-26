import {
  ActionConfig,
  GetResponseResponse,
} from '../../Proto/service/service_pb';
import { ConvaiGRPCClient } from './convai_grpc_client';
import { AudioPlayer } from './audio_player_new';
import { AudioRecorder } from './audio_recorder';
export interface ConvaiClientParams {
  apiKey: string;
  characterId: string;
  enableAudio: boolean;
  disableAudioGeneration?: boolean;
  enableFacialData?: boolean;
  enableEmotionalData?: boolean;
  faceModel?: 0 | 1 | 2 | 3;
  sessionId: string;
  languageCode?: string;
  actionConfig?: any;
}

export class ConvaiClient {
  private sessionId: string;
  private responseCallback: (response: GetResponseResponse) => void | undefined;
  private apiKey: string;
  private characterId: string;
  private languageCode: string;
  private enableAudio: boolean;
  private disableAudioGeneration: boolean;
  private actionConfig: ActionConfig;
  private audioRecorder: AudioRecorder | undefined;
  private audioPlayer: AudioPlayer | undefined;
  private convaiGrpcClient: ConvaiGRPCClient | undefined;
  private faceModel: 0 | 1 | 2 | 3;
  private enableFacialData: boolean;
  private enableEmotionalData: boolean;
  constructor(params: ConvaiClientParams) {
    this.apiKey = params.apiKey;
    this.characterId = params.characterId;
    this.enableAudio = params.enableAudio;
    this.languageCode = params.languageCode || 'en-US';
    this.sessionId = params.sessionId;
    this.enableAudio = params.enableAudio;
    this.disableAudioGeneration = params.disableAudioGeneration || false;
    this.enableFacialData = params.enableFacialData || false;
    this.enableEmotionalData = params.enableEmotionalData || false;
    this.faceModel = params.faceModel || 3;
    this.actionConfig = new ActionConfig();
    if (params.actionConfig) {
      this.actionConfig.setActionsList(params.actionConfig.actions);
      // this.actionConfig.setObjectsList(params.actionConfig.objects);
    }
    if (this.enableAudio) {
      this.audioRecorder = new AudioRecorder();
      this.audioPlayer = new AudioPlayer(44100);
    }
    console.warn = () => {};
  }
  private validateBeforeRequest() {
    if (this.responseCallback == undefined) {
      console.log(
        'CONVAI(ERROR): responseCallback needs to set before making any request.'
      );
      return false;
    }
    return true;
  }
  public resetSession() {
    this.sessionId = '-1';
    this.convaiGrpcClient = undefined;
  }
  public setResponseCallback(fn: (response: GetResponseResponse) => void) {
    this.responseCallback = (resp: GetResponseResponse) => {
      if (resp.getSessionId() !== '') {
        this.sessionId = resp.getSessionId();
      }

      if (
        this.enableAudio &&
        !this.disableAudioGeneration &&
        resp.hasAudioResponse() &&
        !resp.getAudioResponse()?.hasVisemesData()
      ) {
        this.audioPlayer?.addChunk(
          resp!.getAudioResponse()!.getAudioData_asU8(),
          resp?.getAudioResponse()?.getAudioConfig()?.getSampleRateHertz()
        );
        if (resp.getAudioResponse()?.getEndOfResponse()) {
          this.audioPlayer?.addChunk(null);
        }
      } else if (
        this.enableAudio &&
        !this.disableAudioGeneration &&
        resp.hasAudioResponse() &&
        resp.getAudioResponse()?.getEndOfResponse()
      ) {
        this.audioPlayer?.addChunk(null);
      }

      // Call the provided callback function
      fn(resp);
    };
  }

  public sendTextChunk(text: string) {
    if (!this.validateBeforeRequest()) {
      return;
    }
    if (this.convaiGrpcClient == undefined) {
      this.convaiGrpcClient = new ConvaiGRPCClient(
        this.apiKey,
        this.characterId,
        this.sessionId,
        this.responseCallback,
        this.languageCode,
        this.disableAudioGeneration,
        this.actionConfig,
        this.enableFacialData,
        this.enableEmotionalData,
        this.faceModel
      );
    }
    this.convaiGrpcClient.sendText(text);
    this.convaiGrpcClient = undefined;
  }
  public startAudioChunk() {
    if (!this.validateBeforeRequest()) {
      return;
    }
    if (this.enableAudio != true) {
      console.log('CONVAI(ERROR): Audio mode disabled.');
      return;
    }
    if (this.convaiGrpcClient == undefined) {
      this.convaiGrpcClient = new ConvaiGRPCClient(
        this.apiKey,
        this.characterId,
        this.sessionId,
        this.responseCallback,
        this.languageCode,
        this.disableAudioGeneration,
        this.actionConfig,
        this.enableFacialData,
        this.enableEmotionalData,
        this.faceModel
      );
    }
    this.audioRecorder?.start((chunk: ArrayBuffer) => {
      this.convaiGrpcClient?.sendAudioChunk(chunk);
    });
  }
  public endAudioChunk() {
    if (this.enableAudio != true) {
      console.log('CONVAI(ERROR): Audio mode disabled.');
      return;
    }
    this.audioRecorder?.stop();
    this.convaiGrpcClient?.finishSend();
    this.convaiGrpcClient = undefined;
  }

  public toggleAudioVolume() {
    if (!this.enableAudio) {
      console.log('CONVAI(ERROR): Audio mode disabled.');
      return;
    }
    if (this.audioPlayer) {
      const currentVolume = this.audioPlayer?.getVolume();
      if (currentVolume === 0) {
        this.audioPlayer?.setAudioVolume(1);
      } else {
        this.audioPlayer?.setAudioVolume(0);
      }
    }
  }

  public getAudioVolume() {
    if (this.audioPlayer) {
      const currentVolume = this.audioPlayer?.getVolume();
      return currentVolume;
    }
  }

  public onAudioPlay(fn: () => void) {
    this.audioPlayer?.onPlayStart(fn);
  }

  public onAudioStop(fn: () => void) {
    this.audioPlayer?.onPlayStop(fn);
  }

  public closeConnection() {
    this.convaiGrpcClient?.closeConnection();
    console.log('Connection closed with Convai.');
  }
}
