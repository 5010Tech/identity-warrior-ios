import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Alert, View } from "react-native";
import { Barkoder, BarkoderView } from "barkoder-react-native";
import { useFormContext } from "react-hook-form";
import { BiographicData, DocumentDTO } from "@/types";
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
} from "expo-router";
import { tHelper } from "@/translations/translationHelper";
import { parseDL } from "@/util/dlParser";
import { useAutofill } from "@/components/autofill/context/AutofillContext";
import { Button } from "@/components/Button";
import { SafeAreaView } from "@/components/themed";

const BarcodeScanner = () => {
  const [barkoder, setBarkoder] = useState(null);
  const [, setIsScanning] = useState(false);
  const { setValue, getValues } = useFormContext<BiographicData>();
  const { getValue } = useAutofill();
  const { scanType } = useLocalSearchParams<{ scanType?: string }>();
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      if (!barkoder) return;
      setIsScanning(true);
      startScanning(barkoder);
      return () => {
        stopScanning();
      };
    }, [scanType, barkoder]),
  );

  useEffect(() => {
    let title = "";
    if (scanType === "ID") title = tHelper("docScan");
    else if (scanType === "DNA") title = tHelper("dnaScan");

    navigation.setOptions({ title });
  }, [scanType, navigation]);

  const onBarkoderViewCreated = async (_barkoder) => {
    try {
      _barkoder.setBarcodeTypeEnabled(Barkoder.BarcodeType.idDocument, true);
      _barkoder.setBarcodeTypeEnabled(Barkoder.BarcodeType.qr, true);
      _barkoder.setBarcodeTypeEnabled(Barkoder.BarcodeType.upcA, true);
      _barkoder.setBarcodeTypeEnabled(Barkoder.BarcodeType.code11, true);
      _barkoder.setBarcodeTypeEnabled(Barkoder.BarcodeType.code128, true);
      _barkoder.setBarcodeTypeEnabled(Barkoder.BarcodeType.code25, true);
      _barkoder.setBarcodeTypeEnabled(Barkoder.BarcodeType.code32, true);
      _barkoder.setBarcodeTypeEnabled(Barkoder.BarcodeType.code39, true);
      _barkoder.setBarcodeTypeEnabled(Barkoder.BarcodeType.code93, true);
      _barkoder.setBarcodeTypeEnabled(Barkoder.BarcodeType.pdf417, true);
      _barkoder.setBarcodeTypeEnabled(Barkoder.BarcodeType.pdf417Micro, true);
      _barkoder.setBarcodeTypeEnabled(Barkoder.BarcodeType.codabar, true);
      _barkoder.setCloseSessionOnResultEnabled(false);
      _barkoder.setRegionOfInterestVisible(true);
      _barkoder.setCloseSessionOnResultEnabled(true);
      _barkoder.setImageResultEnabled(false);
      setBarkoder(_barkoder);
      startScanning(_barkoder);
    } catch (error) {
      console.error("Error initializing Barkoder:", error);
      Alert.alert("Error", tHelper("failedInit"));
    }
  };

  const startScanning = (bk?: any) => {
    const instance = bk ?? barkoder;
    if (!instance) {
      return;
    }
    setIsScanning(true);
    instance.startScanning(
      (result) => {
        setIsScanning(false);
        delete result.resultThumbnailsAsBase64;
        let type = result.decoderResults[0].barcodeTypeName;
        if (type == "MRZ") {
          let obj = JSON.parse(result.decoderResults[0].extra.JSON);
          let normal = obj.normal;
          setValue("lastName", normal.last_name);
          setValue("firstName", normal.first_name);
          setValue("dob", parseDateString(normal.date_of_birth));
          setValue("sex", normal.gender);
          setValue("citizenship", normal.issuing_country);
          setValue("birthCountry", normal.nationality);
          Object.entries(normal).forEach(([k, v]) => {
            v && setValue(k as keyof BiographicData, v);
          });

          const docs: DocumentDTO[] = getValues("documents") || [];

          let t = "P";
          if (normal.document_type != "P") {
            t = "ID";
          }

          const emptyDoc: DocumentDTO = {
            country: normal.issuing_country,
            description: "",
            expirationDate: parseDateString(normal.date_of_expiry),
            issueDate: calculateIssueDate(
              normal.date_of_expiry,
              normal.date_of_birth,
            ),
            type: t,
            identification: normal.document_number,
          };
          if (
            !docs.some((doc) => doc.identification === emptyDoc.identification)
          ) {
            setValue("documents", [...docs, emptyDoc]);
          } else {
            Alert.alert("Error", tHelper("docExists"), [
              {
                text: "Add",
                onPress: () => setValue("documents", [...docs, emptyDoc]),
              },
              {
                text: "Replace",
                onPress: () =>
                  setValue(
                    "documents",
                    docs.map((doc) =>
                      doc.identification === emptyDoc.identification
                        ? emptyDoc
                        : doc,
                    ),
                    {
                      shouldDirty: true,
                      shouldValidate: true,
                      shouldTouch: true,
                    },
                  ),
              },
              { text: "Continue", style: "cancel" as "cancel" },
            ]);
          }
          router.back();
        } else if (scanType == "ID" && type == "PDF 417") {
          const parsed = parseDL(result.decoderResults[0].textualData);

          Object.entries(parsed).forEach(([k, v]) => {
            v && setValue(k as keyof BiographicData, v);
          });

          const docs: DocumentDTO[] = getValues("documents") || [];
          const emptyDoc: DocumentDTO = {
            country: parsed.country ?? "",
            description: `${parsed.addressStreet} ${parsed.city}, ${parsed.state} ${parsed.postalCode}`,
            expirationDate: parsed.expirationDate ?? "",
            issueDate: parsed.issueDate ?? "",
            type: "ID",
            identification: parsed.licenseNumber ?? "",
          };
          if (
            !docs.some((doc) => doc.identification === emptyDoc.identification)
          ) {
            setValue("documents", [...docs, emptyDoc]);
          } else {
            Alert.alert(tHelper("error"), tHelper("docExists"), [
              {
                text: tHelper("add"),
                onPress: () => setValue("documents", [...docs, emptyDoc]),
              },
              {
                text: tHelper("replace"),
                onPress: () =>
                  setValue(
                    "documents",
                    docs.map((doc) =>
                      doc.identification === emptyDoc.identification
                        ? emptyDoc
                        : doc,
                    ),
                    {
                      shouldDirty: true,
                      shouldValidate: true,
                      shouldTouch: true,
                    },
                  ),
              },
              { text: tHelper("continue"), style: "cancel" as "cancel" },
            ]);
          }
          router.back();
        } else {
          setValue("dnaId", result.decoderResults[0].textualData);
          const autofillValues = getValue("biographics");
          setValue("dnaSystem", autofillValues?.dnaSystem);
          router.back();
        }
      },
      (error: any) => {
        console.error("Scanning error:", error);
        Alert.alert("Error", tHelper("scanningFailed"));
        setIsScanning(false);
      },
    );
  };

  const stopScanning = () => {
    if (barkoder) {
      barkoder.stopScanning();
      setIsScanning(false);
    }
  };

  function parseDateString(dateStr?: string): Date | string {
    if (!dateStr) return "";
    // Expect exactly 6 digits: yyMMdd
    const regex = /^(\d{2})(\d{2})(\d{2})$/;
    const match = dateStr.match(regex);

    if (!match) {
      return ""; // invalid format
    }

    const [_, yy, MM, dd] = match;

    // Convert to numbers
    let year = Number(yy);
    const month = Number(MM);
    const day = Number(dd);

    // Handle century (assume 1900–1999 if >= 50, else 2000–2099)
    year += year >= 50 ? 1900 : 2000;

    // Month in JS Date is 0-based
    return new Date(year, month - 1, day);
  }

  function parseDateYYMMDD(dateString: string): Date {
    if (!/^\d{6}$/.test(dateString)) {
      throw new Error("Invalid date format, must be yyMMdd");
    }
    const yy = parseInt(dateString.slice(0, 2), 10);
    const mm = parseInt(dateString.slice(2, 4), 10);
    const dd = parseInt(dateString.slice(4, 6), 10);
    // Handle century (assume >= 50 → 1900s, else 2000s)
    const year = yy >= 50 ? 1900 + yy : 2000 + yy;
    return new Date(year, mm - 1, dd);
  }

  function calculateIssueDate(
    expiryString?: string,
    birthString?: string,
  ): Date | string {
    if (!expiryString || !birthString) return "";
    const expiryDate = parseDateYYMMDD(expiryString);
    const birthDate = parseDateYYMMDD(birthString);

    // Default assumption: 10 years
    let issueDate = new Date(expiryDate);
    issueDate.setFullYear(issueDate.getFullYear() - 10);
    issueDate.setDate(issueDate.getDate() + 1); // +1 day

    // Calculate age at issue date
    const ageAtIssue =
      issueDate.getFullYear() -
      birthDate.getFullYear() -
      (issueDate <
      new Date(
        issueDate.getFullYear(),
        birthDate.getMonth(),
        birthDate.getDate(),
      )
        ? 1
        : 0);

    if (ageAtIssue < 16) {
      // Adjust to 5 years validity for minors
      issueDate = new Date(expiryDate);
      issueDate.setFullYear(issueDate.getFullYear() - 5);
      issueDate.setDate(issueDate.getDate() + 1); // +1 day
    }

    return issueDate;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.scannerWrapper}>
        <BarkoderView
          style={styles.barkoderView}
          licenseKey="PEmBIohr9EZXgCkySoetbwP4gvOfMcGzgxKPL2X6uqOFADL-8hO3BaimQeNMdCFmnQcmtscDk2ZNzE_a9-l0dr3wfuZWowNheRi0dymJbU4PtW33frUDChuhm0KFfQUpyAeXFP-g0QQ1jjKp8QJDKYiNJrbwvifh_W8ERBmWxH47kbynhCQmgeb0V0AYwdU_pa7pA_zB99-FgfuMDyyedWqIDdlep6N6Nhhhvuf8z4lUDbsSICijYzjI45Cp5_5I"
          onBarkoderViewCreated={onBarkoderViewCreated}
        />
      </View>

      {/* Bottom 10% Cancel Button */}
      <View style={styles.bottom}>
        <Button
          style={styles.cancelButton}
          onPress={() => router.back()}
          text={tHelper("cancel")}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scannerWrapper: {
    flex: 19, // top 95%
  },
  barkoderView: {
    flex: 1,
    width: "100%",
  },
  bottom: {
    flex: 1, // bottom 5%
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  cancelButton: {
    width: "50%",
  },
});

export default BarcodeScanner;
