import { tHelper } from "@/translations/translationHelper";
import { MaterialIcons } from "@expo/vector-icons";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
  DrawerNavigationOptions,
} from "@react-navigation/drawer";
import { withLayoutContext } from "expo-router";
import { BiographicData } from "@/types/BiographicData";
import { TransactionType } from "@/types/Transaction";
import { FormProvider, useForm } from "react-hook-form";
import { biographicsFormSchema } from "@/components/form/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAutofill } from "@/components/autofill/context/AutofillContext";
import { useCaptureValue } from "@/features/capture/context/hooks";

const { Navigator } = createDrawerNavigator();
export const Drawer = withLayoutContext(Navigator);

// Map file names to nice labels
const screenTitleMap: Record<string, string> = {
  index: tHelper("biographics"),
  barkoder: tHelper("docScan"),
  license_scan: tHelper("scanLicenseBarcode"),
  passport_scan: tHelper("scanPassportMrz"),
};

export default function BiographicsLayout() {
  const biographicData = useCaptureValue<BiographicData>(
    "transaction.biographicData",
  );
  const tot = useCaptureValue<TransactionType>("transaction.tot");
  const formMethods = useForm<BiographicData>({
    defaultValues: biographicData,
    resolver: zodResolver(biographicsFormSchema(tot)),
  });

  const { getValue } = useAutofill();

  const handleNavigate = (drawerNavigation: any, routeName: string) => {
    drawerNavigation.navigate(routeName);
    drawerNavigation.closeDrawer();
  };

  const handleAutofill = (drawerNavigation: any) => {
    const autofillValues = getValue("biographics");
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
          title:
            screenTitleMap[route.name] ??
            route.name.charAt(0).toUpperCase() + route.name.slice(1),
        })}
        drawerContent={(props) => (
          <DrawerContentScrollView {...props}>
            <DrawerItem
              label={tHelper("autofill")}
              onPress={() => handleAutofill(props.navigation)}
              icon={({ color, size }) => (
                <MaterialIcons name="edit-document" color={color} size={size} />
              )}
            />
            <DrawerItem
              label={tHelper("scanLicenseBarcode")}
              onPress={() => handleNavigate(props.navigation, "license_scan")}
              icon={({ color, size }) => (
                <MaterialIcons name="credit-card" color={color} size={size} />
              )}
            />
            <DrawerItem
              label={tHelper("scanPassportMrz")}
              onPress={() => handleNavigate(props.navigation, "passport_scan")}
              icon={({ color, size }) => (
                <MaterialIcons name="badge" color={color} size={size} />
              )}
            />
          </DrawerContentScrollView>
        )}
      />
    </FormProvider>
  );
}
