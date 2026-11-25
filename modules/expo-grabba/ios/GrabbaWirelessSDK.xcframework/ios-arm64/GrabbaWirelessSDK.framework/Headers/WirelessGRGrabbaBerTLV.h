//
//  WirelessGRGrabbaBerTLV.h
//  GrabbaWirelessSDK
//
//  Duplicated from GrabbaSDK GRGrabbaBerTLV.h
//             for the use of GrabbaBerTLV within the isolated Wireless SDK
//
//  Created by Murray Hughes on 3/08/11.
//  Copyright 2011 Grabba International. All rights reserved.
//

#import <Foundation/Foundation.h>

@class WirelessGRDataReader;

/**
 * Grabba representation of a BER-TLV object
 */
@interface WirelessGRGrabbaBerTLV : NSObject


@property (assign, readonly) int tag;
@property (assign, readonly) BOOL isValuePrimitive;
@property (assign, readonly) BOOL isValueBerTlv;
@property (strong, readonly) NSData* primitiveValue;
@property (strong, readonly) NSArray* berTlvValue;

/**
 * Create a BER-TLV object with given data.
 */
+ (WirelessGRGrabbaBerTLV*) grabbaBerTLVWithData:(NSData*) data;
/**
 * Create a BER-TLV object with a given data reader.
 */
+ (WirelessGRGrabbaBerTLV*) grabbaBerTLVWithDataReader:(WirelessGRDataReader*) dataReader;

- (WirelessGRGrabbaBerTLV*) findObjectByTag:(int) tag;
- (NSArray*) listObjectsWithTag:(int) tag;

- (NSData*) getRawData;

@end
