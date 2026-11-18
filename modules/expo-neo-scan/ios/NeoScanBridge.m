#import "NeoScanBridge.h"
#import "NECNeoScan.h"
#import "EADSessionController.h"

@implementation NeoScanBridge

- (instancetype)init {
  if ((self = [super init])) {
    [[NSNotificationCenter defaultCenter]
       addObserver:self
          selector:@selector(_sessionDataReceived:)
              name:EADSessionDataReceivedNotification
            object:[EADSessionController sharedController]];
    [[NSNotificationCenter defaultCenter]
       addObserver:self
          selector:@selector(AccessoryConnected:)
              name:EAAccessoryDidConnectNotification
            object:nil];
    [[NSNotificationCenter defaultCenter]
       addObserver:self
          selector:@selector(AccessoryDisconnected:)
              name:EAAccessoryDidDisconnectNotification
            object:nil];
  }
  return self;
}

- (void)dealloc {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

// Called when new data is available from the accessory stream
- (void)_sessionDataReceived:(NSNotification *)notification {
    // Get the current session read buffer contents
    [self.communicator _sessionDataReceived:
            [NSNotification notificationWithName:notification.name object:self userInfo:nil]];
}

// Optional — these are often required by the SDK to respond to connection events
- (void)AccessoryConnected:(NSNotification *)notification {
    NSLog(@"🔌 Accessory connected");
}

- (void)AccessoryDisconnected:(NSNotification *)notification {
    NSLog(@"❌ Accessory disconnected");
}

// Required if the SDK expects your module to provide these
- (NSData *)getReadData {
    return [[EADSessionController sharedController] getReadData];
}

- (NSUInteger)readBytesAvailable {
    return [[EADSessionController sharedController] readBytesAvailable];
}

- (NSData *)readData:(NSUInteger)bytesToRead {
    return [[EADSessionController sharedController] readData:bytesToRead];
}

- (void)receiveResponse:(NSString *)str {
    NSLog(@"📥 SDK Response: %@", str);
}

@end
