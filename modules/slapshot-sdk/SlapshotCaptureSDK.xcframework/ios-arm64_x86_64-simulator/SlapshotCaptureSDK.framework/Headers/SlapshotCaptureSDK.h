#import <Foundation/Foundation.h>
#import <SlapshotCaptureSDK/FingerprintsNativeBridge.h>
#import <SlapshotCaptureSDK/DetectCircleResponse.h>

int comp_nfiq(int *onfiq, float *oconf, unsigned char *idata,
              const int iw, const int ih, const int id, const int ippi,
              int *optflag);

int wsq_encode_mem(unsigned char **, int *, const float, unsigned char *,
                   const int, const int, const int, const int, char *);

//! Project version number for SlapshotCaptureSDK.
FOUNDATION_EXPORT double SlapshotCaptureSDKVersionNumber;

//! Project version string for SlapshotCaptureSDK.
FOUNDATION_EXPORT const unsigned char SlapshotCaptureSDKVersionString[];

// In this header, you should import all the public headers of your framework using statements like #import <SlapshotCaptureSDK/PublicHeader.h>
