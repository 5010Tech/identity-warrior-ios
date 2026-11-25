import { Button } from "@/components/Button";
import { FormButtons } from "@/components/form";
import { InputSelect, InputText } from "@/components/input";
import { Section } from "@/components/Section";
import { FormContainer } from "@/components/Structure";
import { SafeAreaView, Text, useThemeColor } from "@/components/themed";
import {
  DEFAULT_INDICATOR,
  MAX_TATTOO_COLORS,
  smtCategories,
  smtCodesFor,
  smtIndicators,
  tattooClasses,
  tattooColors,
  tattooSubClasses,
} from "@/constants/smt";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  useCaptureActions,
  useCaptureValue,
} from "@/features/capture/context/hooks";
import { SmtEntry } from "@/features/capture/types";
import { tHelper } from "@/translations/translationHelper";
import { useGoBackOnce } from "@/components/navigation/useGoBackOnce";
import { takePendingSmtPhoto, takeSmtPhoto } from "@/features/capture/smtPhoto";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

/**
 * Add or edit one scar, mark or tattoo, like the Android app's smt_edit.xml:
 * the photo, then its category, NCIC code and an optional description.
 */
export default function SmtEditScreen() {
  const goBack = useGoBackOnce();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const smts = useCaptureValue<SmtEntry[]>("smts") ?? [];
  const { setValue } = useCaptureActions();
  const existing = smts.find((smt) => smt.id === id);

  // A new record arrives with the photo just taken from the list screen.
  const [photo, setPhoto] = useState(
    () => existing?.photo ?? takePendingSmtPhoto() ?? "",
  );
  const [category, setCategory] = useState(existing?.category ?? "");
  const [code, setCode] = useState(existing?.code ?? "");
  const [indicator, setIndicator] = useState(existing?.indicator ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [tattooClass, setTattooClass] = useState(existing?.tattooClass ?? "");
  const [tattooSubClass, setTattooSubClass] = useState(
    existing?.tattooSubClass ?? "",
  );
  // Like Android, one (empty, optional) color picker is always showing.
  const [colors, setColors] = useState<string[]>(
    existing?.tattooColors?.length ? existing.tattooColors : [""],
  );
  const isTattoo = category === "tattoos";
  // Some categories have no code indicator (Android hides the field for them).
  const usesIndicator = category in DEFAULT_INDICATOR;
  const [showErrors, setShowErrors] = useState(false);
  const danger = useThemeColor({}, "danger");
  const required = tHelper("valueRequired");

  const takePhoto = async () => {
    const taken = await takeSmtPhoto();
    if (taken) setPhoto(taken);
  };

  const changeCategory = (next: string) => {
    setCategory(next);
    // Codes belong to a category, so a new category clears the old code.
    if (next !== category) {
      setCode("");
      setIndicator(DEFAULT_INDICATOR[next] ?? "");
    }
  };

  const setColor = (index: number, value: string) =>
    setColors((current) => current.map((c, i) => (i === index ? value : c)));
  const removeColor = (index: number) =>
    setColors((current) => {
      const next = current.filter((_, i) => i !== index);
      return next.length ? next : [""];
    });

  const save = () => {
    if (!photo || !category || !code || (usesIndicator && !indicator)) {
      setShowErrors(true);
      return;
    }
    const entry: SmtEntry = {
      id: existing?.id ?? `${Date.now()}`,
      photo,
      category,
      code,
      indicator: usesIndicator ? indicator : undefined,
      description: description.trim() || undefined,
      tattooClass: isTattoo && tattooClass ? tattooClass : undefined,
      tattooSubClass: isTattoo && tattooSubClass ? tattooSubClass : undefined,
      tattooColors: isTattoo ? colors.filter(Boolean) : undefined,
    };
    setValue(
      "smts",
      existing
        ? smts.map((smt) => (smt.id === entry.id ? entry : smt))
        : [...smts, entry],
    );
    goBack();
  };

  return (
    <SafeAreaView edges={["bottom"]} style={StyleSheet.absoluteFill}>
      <FormContainer style={styles.container}>
        <Section title={tHelper("smts")}>
          {photo ? (
            <Image
              source={{ uri: `data:image/jpeg;base64,${photo}` }}
              style={styles.photo}
              resizeMode="contain"
            />
          ) : null}
          <Button
            text={tHelper(photo ? "smtRetakePhoto" : "smtTakePhoto")}
            variant="secondary"
            icon="camera"
            onPress={takePhoto}
          />
          {showErrors && !photo ? (
            <Text style={{ color: danger }}>{tHelper("smtPhotoRequired")}</Text>
          ) : null}
        </Section>
        <Section title={tHelper("smtDetailsSection")}>
          <InputSelect
            label={tHelper("smtCategory")}
            items={smtCategories}
            value={category}
            onChange={changeCategory}
            error={showErrors && !category ? required : undefined}
            required
          />
          {category ? (
            <InputSelect
              label={tHelper("smtCode")}
              items={smtCodesFor(category)}
              value={code}
              onChange={setCode}
              error={showErrors && !code ? required : undefined}
              required
            />
          ) : null}
          {usesIndicator ? (
            <InputSelect
              label={tHelper("smtCodeInd")}
              items={smtIndicators}
              value={indicator}
              onChange={setIndicator}
              error={showErrors && !indicator ? required : undefined}
              required
            />
          ) : null}
          <InputText
            label={tHelper("smtDescription")}
            value={description}
            onChange={setDescription}
            autoCapitalize="sentences"
            maxLength={255}
          />
        </Section>
        {isTattoo && (
          <Section title={tHelper("sectionTattoo")}>
            <InputSelect
              label={tHelper("tattooClass")}
              items={tattooClasses}
              value={tattooClass}
              onChange={setTattooClass}
            />
            <InputSelect
              label={tHelper("tattooSubClass")}
              items={tattooSubClasses}
              value={tattooSubClass}
              onChange={setTattooSubClass}
            />
            {/* Kept in one tight group, not spread out like separate fields. */}
            <View style={styles.colors}>
            {colors.map((color, index) => (
              <View key={index} style={styles.colorRow}>
                <View style={styles.colorField}>
                  <InputSelect
                    label={index === 0 ? tHelper("tattooColors") : undefined}
                    countKey="tattooColor"
                    items={tattooColors}
                    value={color}
                    onChange={(value) => setColor(index, value)}
                  />
                </View>
                {/* No remove button on the one empty, optional picker. */}
                {color || colors.length > 1 ? (
                  <Pressable
                    onPress={() => removeColor(index)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={tHelper("removeColor")}
                    style={styles.colorRemove}
                  >
                    <MaterialCommunityIcons
                      name="close-circle-outline"
                      size={30}
                      color={danger}
                    />
                  </Pressable>
                ) : null}
              </View>
            ))}
            </View>
            {colors.length < MAX_TATTOO_COLORS && (
              <Button
                text={tHelper("addTattooColor")}
                variant="secondary"
                icon="plus"
                onPress={() => setColors((current) => [...current, ""])}
              />
            )}
          </Section>
        )}
      </FormContainer>
      <FormButtons
        onCancel={goBack}
        onSubmit={save}
        cancelText={tHelper("back")}
        submitText={tHelper("save")}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 8 },
  photo: { width: "100%", height: 260, borderRadius: 10 },
  colors: { gap: 6 },
  colorRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  colorField: { flex: 1 },
  colorRemove: { height: 54, justifyContent: "center" },
});
