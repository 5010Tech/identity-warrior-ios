import { useAutofillSelector } from "@/components/autofill/context/useAutofillSelector";
import { SubmissionsContainer } from "@/components/submissions";
import { SafeAreaView } from "@/components/themed";
import { DodSubmissions } from "@/features/ebts/DodSubmissions";

export default function SubmissionsScreen() {
  // DoD: the transactions stored encrypted on this phone. DHS: IXM submissions.
  const isDod = useAutofillSelector(
    (s) => s.appSettings?.collectionMode !== "DHS",
  );
  return (
    <SafeAreaView style={{ flex: 1 }}>
      {isDod ? <DodSubmissions /> : <SubmissionsContainer />}
    </SafeAreaView>
  );
}
