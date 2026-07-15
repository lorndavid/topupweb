declare module 'bakong-khqr' {
  export const khqrData: {
    currency: {
      khr: number;
      usd: number;
    };
  };

  export class IndividualInfo {
    constructor(
      bakongAccountID: string,
      merchantName: string,
      merchantCity: string,
      optionalData: {
        currency?: number;
        amount?: number;
        billNumber?: string;
        mobileNumber?: string;
        storeLabel?: string;
        terminalLabel?: string;
        expirationTimestamp?: number;
        merchantCategoryCode?: string;
        accountInformation?: string;
        acquiringBank?: string;
        languagePreference?: string;
        merchantNameAlternateLanguage?: string;
        merchantCityAlternateLanguage?: string;
        purposeOfTransaction?: string;
      }
    );
  }

  export class MerchantInfo {
    constructor(
      bakongAccountID: string,
      merchantName: string,
      merchantCity: string,
      merchantId: string,
      acquiringBank: string,
      optionalData: Record<string, any>
    );
  }

  export class SourceInfo {
    constructor(
      appIconUrl: string,
      appName: string,
      appDeepLinkCallback: string
    );
  }

  export class BakongKHQR {
    generateIndividual(individualInfo: IndividualInfo): {
      status: { code: number; message: string };
      message: string;
      data: {
        qr: string;
        md5: string;
        envelope: string;
      };
    };

    generateMerchant(merchantInfo: MerchantInfo): {
      status: { code: number; message: string };
      message: string;
      data: {
        qr: string;
        md5: string;
        envelope: string;
      };
    };

    generateDeepLink(
      url: string,
      khqrString: string,
      sourceInfo?: SourceInfo
    ): Promise<string>;

    static verify(khqrString: string): {
      isValid: boolean;
    };

    static decode(khqrString: string): {
      status: { code: number; message: string };
      message: string;
      data: Record<string, any>;
    };

    static decodeNonKhqr(khqrString: string): Record<string, any>;

    static checkBakongAccount(
      apiUrl: string,
      accountId: string
    ): Promise<any>;
  }
}
