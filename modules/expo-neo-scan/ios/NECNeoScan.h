/*--------------------------------------------------------------------
 *
 *  Copyright (C) NEC Corporation 2015
 *
 *
 *    NEC CONFIDENTIAL AND PROPRIETARY
 *    All rights reserved by NEC Corporation.
 *    This program must be used solely for the purpose for which
 *    it was furnished by NEC Corporation.   No part of this
 *    program may be reproduced or disclosed to others, in any
 *    form, without prior written permission of NEC
 *    Corporation.   Use of copyright notice dose not evidence
 *    publication of the program.
 *
 *    NEC Corporation accepts no responsibility for any damages 
 *    resulting from the use of this software.
 *    This software is provided "AS IS", and its user assume all risks 
 *    when using it.
 *    
 *
 *  MobileInterfaceLib.h
 *
 *    Functions entry point for NeoScan SDK Library
 *
 *
 *-----------------------------------------------------------------*/

#ifndef _NECNeoScanSDK_H_
#define _NECNeoScanSDK_H_


#import <Foundation/Foundation.h>
#import <ExternalAccessory/ExternalAccessory.h>



@interface NeoScanBTCommunication : NSObject
{
    // internal members
    EAAccessory *_accessory;
    bool bConnected;
    int requestMode;
    SEL callback;
    NSObject* caller;
    
    BOOL bDownloadComplete;
    
    NSMutableData* downloadData;
    int nDownloadLength;
}

//////////// internal functions////////////////////////////////////////////

- (void)_sessionDataReceived:(NSNotification *)notification;
-(void)setCallBack:(SEL)cb object:(NSObject*)obj;

/////////// interface functions /////////////////////////////////////////

-(BOOL) ConnectNeoScan: (NSObject*) obj;
-(void) DisconnectNeoScan:  (NSObject*) obj;

-(void)getConfiguration;
-(void)SetConfiguration:(NSString*)configuration;
-(void)setCustomProfile:(NSString*)strProfile;
-(void)getImageList;
-(void)getImage: (NSString*) strImageName;
-(void)DeleteImage:(NSString*)strImageName;
-(void)DeleteAll;
-(void)updateTime;

@end

//////////////////////////////////////////////////////////////////////////
#ifdef __cplusplus
extern "C" {
#endif // __cplusplus

#ifndef BYTE
#define BYTE unsigned char
#endif


///////////////////////// Image format conversion  ///////////////////////


int  BMPtoRAW(BYTE* pImageIn, int nImageLen, BYTE **ppImageOut, int *pOutImageLen, int *pWidth, int *pHeight, int *pDPI);
int  RAWtoBMP(int width, int height, int DPI, int depth, BYTE* pImageIn, BYTE** ppImageOut, int *pOutImageLen);

int  BMPtoWSQ(BYTE* pImageIn, int nImageLen, float fRate, BYTE** ppImageOut, int *pOutImageLen);
int  WSQtoBMP(BYTE* pImageIn, int nImageLen, BYTE **ppImageOut, int *pOutImageLen);

int  PNGtoBMP(BYTE* pImageIn, int nImageLen, BYTE **ppImageOut, int *pOutImageLen);
int  BMPtoPNG(BYTE* pImageIn, int nImageLen, BYTE** ppImageOut, int *pOutImageLen);

int  MemFree(BYTE* pImage);

#ifdef __cplusplus
}
#endif // __cplusplus


#define CARDREADER_BUFFER_SIZE	2048
#define TRUE 1
#define FALSE 0

/////////// magstripe data decoder function ///////////////////////////
int decodeMagStripe(unsigned char* dataIn,  char* dataOut, int* dataSize);

// returns 0 for success and non-zero for failure

///////////////////////////////////////////////////////////////////////


#endif // _NECNeoScanSDK_H_
