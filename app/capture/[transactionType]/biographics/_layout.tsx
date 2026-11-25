import { tHelper } from "@/translations/translationHelper";
import {
  createDrawerNavigator,
  DrawerNavigationOptions,
} from "@react-navigation/drawer";
import { IwDrawerContent } from "@/components/navigation/IwDrawerContent";
import { DrawerMenuButton } from "@/components/navigation";
import { withLayoutContext } from "expo-router";
import { BiographicData } from "@/types/BiographicData";
import { TransactionType } from "@/types/Transaction";
import { FormProvider, useForm } from "react-hook-form";
import { biographicsFormSchema } from "@/components/form/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAutofill } from "@/components/autofill/context/AutofillContext";
import { useCaptureValue } from "@/features/capture/context/hooks";
import { useAutofillSelector } from "@/components/autofill/context/useAutofillSelector";
import { dodBiographicsSchema } from "@/components/form/dodValidation";

const { Navigator } = createDrawerNavigator();
export const Drawer = withLayoutContext(Navigator);

// Map file names to nice labels
const screenTitleMap: Record<string, string> = {
  index: tHelper("biographics"),
  barkoder: tHelper("docScan"),
  barcode_scan: tHelper("dnaScan"),
  license_scan: tHelper("scanLicenseBarcode"),
  passport_scan: tHelper("scanPassportMrz"),
};

export default function BiographicsLayout() {
  const biographicData = useCaptureValue<BiographicData>(
    "transaction.biographicData",
  );
  const tot = useCaptureValue<TransactionType>("transaction.tot");
  // DoD mode uses the Android app's Type-2 fields and rules; DHS keeps its own.
  const isDod = useAutofillSelector(
    (s) => s.appSettings?.collectionMode !== "DHS",
  );
  const dodTot = useCaptureValue<string | undefined>("dodTot");
  const formMethods = useForm<BiographicData>({
    defaultValues: biographicData,
    resolver: zodResolver(
      isDod ? dodBiographicsSchema(dodTot) : biographicsFormSchema(tot),
    ) as any,
  });

  const { getValue } = useAutofill();

  const handleNavigate = (drawerNavigation: any, routeName: string) => {
    drawerNavigation.navigate(routeName);
    drawerNavigation.closeDrawer();
  };

  const handleAutofill = (drawerNavigation: any) => {
    // DoD fills from Settings > Type-2; DHS from Autofill Settings.
    const type2 = getValue("type2Settings");
    const autofillValues: Partial<BiographicData> | null | undefined = isDod
      ? type2 && {
          firstName: type2.givenName,
          lastName: type2.surname,
          sex: type2.sex as BiographicData["sex"],
          height: type2.height as unknown as number,
          weight: type2.weight as unknown as number,
          eyeColor: type2.eyeColor as BiographicData["eyeColor"],
          hairColor: type2.hairColor as BiographicData["hairColor"],
          race: type2.race as BiographicData["race"],
          dob: type2.dob ? new Date(type2.dob) : "",
          birthCountry: type2.birthCountry as BiographicData["birthCountry"],
          citizenship: type2.citizenship as BiographicData["citizenship"],
          personnelType: type2.personnelType,
          collectionReason: type2.collectionReason,
          dnaSystem: type2.dnaSystem,
        }
      : getValue("biographics");
    autofillValues &&
      Object.entries(autofillValues).forEach(([k, v]) => {
        const autofillKey = k as keyof BiographicData;
        let formVal = formMethods.getValues(autofillKey);

        if (autofillKey === "dnaSystem") {
          let dnaID = formMethods.getValues("dnaId");
          if (!dnaID?.length) {
            return;
          }
        }

        v && !formVal && formMethods.setValue(autofillKey, v);
      });

    drawerNavigation.closeDrawer();
  };

  return (
    <FormProvider {...formMethods}>
      <Drawer
        screenOptions={({ route }): DrawerNavigationOptions => ({
          headerShown: !["license_scan", "passport_scan"].includes(route.name),
          drawerType: "slide",
          // The app's own menu button: the built-in one was not showing.
          headerLeft: () => <DrawerMenuButton />,
          title:
            screenTitleMap[route.name] ??
            route.name.charAt(0).toUpperCase() + route.name.slice(1),
        })}
        drawerContent={(props) => (
          // Same menu as the Android app's Type-2 screen (type2_menu.xml).
          <IwDrawerContent
            title={tHelper("bioDataOpts")}
            sections={[
              {
                items: [
                  {
                    label: tHelper("drawerAutoFill"),
                    icon: "file-document-edit-outline",
                    onPress: () => handleAutofill(props.navigation),
                  },
                ],
              },
              {
                title: tHelper("drawerDocScan"),
                items: [
                  {
                    label: tHelper("drawerMrzScan"),
                    icon: "passport",
                    onPress: () =>
                      handleNavigate(props.navigation, "passport_scan"),
                  },
                  {
                    label: tHelper("drawerLicenseScan"),
                    icon: "qrcode-scan",
                    onPress: () =>
                      handleNavigate(props.navigation, "license_scan"),
                  },
                ],
              },
            ]}
          />
        )}
      />
    </FormProvider>
  );
}
