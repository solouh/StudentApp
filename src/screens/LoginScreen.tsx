import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRightIcon, ClockIcon, SparkleIcon } from '../components/Icons';
import { colors, fonts, gradients, radius, shadow } from '../theme';

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={gradients.mint}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.root}
    >
      <StatusBar style="dark" />

      {/* soft decorative blobs */}
      <View style={[styles.blob, styles.blobA]} />
      <View style={[styles.blob, styles.blobB]} />
      <View style={[styles.blob, styles.blobC]} />

      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.brandMark}>
          <SparkleIcon size={15} color={colors.ink} strokeWidth={1.9} />
        </View>
        <Text style={styles.brandName}>Student App</Text>
      </View>

      {/* illustration area */}
      <View style={styles.artArea}>
        <View style={styles.artHalo}>
          <View style={styles.artHaloInner}>
            <Text style={styles.artEmoji}>🎓</Text>
          </View>
        </View>

        <View style={[styles.floating, styles.floatingLeft]}>
          <SparkleIcon size={13} color={colors.mintDark} strokeWidth={2} />
          <Text style={styles.floatingText}>Study smarter</Text>
        </View>

        <View style={[styles.floating, styles.floatingRight]}>
          <ClockIcon size={13} color={colors.mintDark} strokeWidth={2} />
          <Text style={styles.floatingText}>20:00 focus</Text>
        </View>
      </View>

      {/* welcome card */}
      <View style={styles.card}>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.body}>
          Manage your lectures, subjects, tasks and focus sessions in one calm
          place. Let&apos;s make this semester count.
        </Text>

        <Pressable
          onPress={onLogin}
          style={({ pressed }) => [styles.googleBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Login with Google"
        >
          <View style={styles.gBadge}>
            <Text style={styles.gLetter}>G</Text>
          </View>
          <Text style={styles.googleText}>Login with Google</Text>
          <View style={styles.arrowCircle}>
            <ChevronRightIcon size={15} color={colors.ink} strokeWidth={2.6} />
          </View>
        </Pressable>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Text style={styles.goodLuck}>Good Luck!</Text>
        <Text style={styles.university}>EMERSON PRESS UNIVERSITY</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  blobA: {
    width: 240,
    height: 240,
    top: -80,
    right: -70,
  },
  blobB: {
    width: 160,
    height: 160,
    bottom: 210,
    left: -70,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  blobC: {
    width: 90,
    height: 90,
    top: 230,
    left: 26,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  header: {
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  brandMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.ink,
    opacity: 0.75,
  },
  artArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artHalo: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artHaloInner: {
    width: 164,
    height: 164,
    borderRadius: 82,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artEmoji: {
    fontSize: 74,
    lineHeight: 92,
  },
  floating: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.82)',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.pill,
    ...shadow.card,
  },
  floatingLeft: {
    left: 16,
    top: '34%',
  },
  floatingRight: {
    right: 14,
    bottom: '29%',
  },
  floatingText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.inkSoft,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 22,
    marginHorizontal: 20,
    ...shadow.float,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 25,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 20,
    color: colors.body,
    marginTop: 8,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingLeft: 8,
    paddingRight: 8,
    paddingVertical: 8,
    marginTop: 20,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  gBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gLetter: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#4285F4',
    lineHeight: 20,
  },
  googleText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 13.5,
    color: colors.white,
  },
  arrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 18,
  },
  goodLuck: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.ink,
    opacity: 0.62,
  },
  university: {
    fontFamily: fonts.medium,
    fontSize: 9.5,
    letterSpacing: 2.2,
    color: colors.ink,
    opacity: 0.4,
    marginTop: 4,
  },
});
