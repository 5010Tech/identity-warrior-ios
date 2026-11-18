// NeoScanBridge.h
#import <Foundation/Foundation.h>

@class NeoScanBTCommunication;

@interface NeoScanBridge : NSObject

@property (nonatomic, strong) NeoScanBTCommunication *communicator;

- (void)_sessionDataReceived:(NSNotification *)notification;
- (void)receiveResponse:(NSString *)str;
- (void)AccessoryConnected:(NSNotification *)notification;
- (void)AccessoryDisconnected:(NSNotification *)notification;
- (NSData*) getReadData;
- (NSUInteger)readBytesAvailable;
- (NSData *)readData:(NSUInteger)bytesToRead;

@end
