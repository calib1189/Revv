import type { ReactElement, SVGProps } from "react";
import {
  SteeringWheelIcon,
  ShiftKnobIcon,
  WheelSpacerIcon,
  LugNutIcon,
  CenterCapIcon,
  TpmsIcon,
  TireIcon,
  WheelIcon,
  BrakeCaliperIcon,
  BrakeRotorIcon,
  BrakePadIcon,
  BrakeLineIcon,
  BrakeIcon,
  PaintIcon,
  GrilleIcon,
  HoodVentIcon,
  HoodIcon,
  BumperIcon,
  FenderIcon,
  CanardIcon,
  SplitterIcon,
  DiffuserIcon,
  SideSkirtIcon,
  RockerPanelIcon,
  QuarterPanelIcon,
  SpoilerIcon,
  MirrorIcon,
  FogLightIcon,
  TailLightIcon,
  HeadlightIcon,
  UnderglowIcon,
  LightBarIcon,
  TurnSignalIcon,
  AmbientLightIcon,
  TintIcon,
  WindshieldIcon,
  WindowNetIcon,
  WindowIcon,
  RoofRackIcon,
  RoofIcon,
  TrunkIcon,
  DoorIcon,
  DecalIcon,
  AntennaIcon,
  BadgeIcon,
  LicensePlateIcon,
  WiperIcon,
  FuelDoorIcon,
  FuelPumpIcon,
  FuelIcon,
  TowHitchIcon,
  BullBarIcon,
  WinchIcon,
  SnorkelIcon,
  RunningBoardIcon,
  LadderRackIcon,
  TonneauCoverIcon,
  BedlinerIcon,
  ConvertibleTopIcon,
  SkidPlateIcon,
  HeaderIcon,
  ExhaustIcon,
  SwayBarIcon,
  StrutBraceIcon,
  AirSuspensionIcon,
  LiftKitIcon,
  BushingIcon,
  BallJointIcon,
  TieRodIcon,
  SubframeIcon,
  SuspensionIcon,
  IntakeIcon,
  WastegateIcon,
  BovIcon,
  TurboIcon,
  ThrottleBodyIcon,
  CamshaftIcon,
  ValveCoverIcon,
  OilPanIcon,
  SparkPlugIcon,
  IgnitionCoilIcon,
  EngineIcon,
  OilFilterIcon,
  OilCoolerIcon,
  FanIcon,
  ThermostatIcon,
  RadiatorIcon,
  TimingBeltIcon,
  DriveBeltIcon,
  AlternatorIcon,
  StarterIcon,
  DifferentialIcon,
  TransferCaseIcon,
  ClutchIcon,
  TransmissionIcon,
  NitrousIcon,
  BatteryIcon,
  ShiftLightIcon,
  GaugeIcon,
  TuningIcon,
  FuseBoxIcon,
  BoltIcon,
  DashCamIcon,
  BackupCameraIcon,
  NavIcon,
  HeadUnitIcon,
  SubwooferBoxIcon,
  SpeakerIcon,
  AlarmIcon,
  RemoteStartIcon,
  FloorMatIcon,
  PedalIcon,
  HeadlinerIcon,
  ConsoleIcon,
  SunVisorIcon,
  CupHolderIcon,
  FireExtinguisherIcon,
  KillSwitchIcon,
  SeatIcon,
  HarnessIcon,
  RollCageIcon,
  BodyKitIcon,
  WrenchIcon,
} from "@/components/ui/icons";

type IconComponent = (props: SVGProps<SVGSVGElement>) => ReactElement;

/** Keyword -> icon, checked in this exact order against the mod's category
 * (falling back to its raw name if category wasn't filled in). Covers the
 * whole car, exterior to interior to drivetrain to electronics, at the
 * level of individual part types, not just broad categories — a "custom
 * grill" gets a grille icon, not the generic body-kit or wrench fallback.
 *
 * Order matters: more specific multi-word phrases have to come before
 * shorter, more general keywords they contain — "steering wheel" before
 * bare "wheel", "brake caliper" before bare "brake", "roof rack" before
 * bare "roof", the named aero pieces (splitter/diffuser/side skirt/canard)
 * before the generic spoiler/body-kit catch-alls — or the general one
 * would win first and the specific part would never get its own icon.
 * Cosmetic only — worst case a slightly-off icon, not a data-correctness
 * concern, so a plain substring check is enough here (unlike the vehicle-
 * category guesser, which needed word-boundary matching to avoid actually
 * miscategorizing a car). */
const CATEGORY_ICONS: { keywords: string[]; icon: IconComponent }[] = [
  // Steering & shifting
  { keywords: ["steering wheel"], icon: SteeringWheelIcon },
  { keywords: ["shift knob", "shifter", "gear knob", "shift boot"], icon: ShiftKnobIcon },

  // Wheels, tires & brakes
  { keywords: ["wheel spacer"], icon: WheelSpacerIcon },
  { keywords: ["lug nut", "lug nuts"], icon: LugNutIcon },
  { keywords: ["center cap", "hub cap", "hubcap"], icon: CenterCapIcon },
  { keywords: ["tpms", "pressure sensor", "tire sensor"], icon: TpmsIcon },
  { keywords: ["tire", "tyre", "tread"], icon: TireIcon },
  { keywords: ["wheel", "rim"], icon: WheelIcon },
  { keywords: ["brake caliper", "caliper"], icon: BrakeCaliperIcon },
  { keywords: ["brake rotor", "rotor", "disc brake"], icon: BrakeRotorIcon },
  { keywords: ["brake pad"], icon: BrakePadIcon },
  { keywords: ["brake line", "brake hose", "stainless line"], icon: BrakeLineIcon },
  { keywords: ["brake", "big brake kit", "bbk", "e-brake", "parking brake"], icon: BrakeIcon },

  // Paint & exterior panels
  { keywords: ["paint", "wrap", "vinyl", "candy", "color change", "colour change", "ceramic coating"], icon: PaintIcon },
  { keywords: ["grille", "grill"], icon: GrilleIcon },
  { keywords: ["hood vent", "hood scoop", "cowl induction"], icon: HoodVentIcon },
  { keywords: ["hood", "bonnet"], icon: HoodIcon },
  { keywords: ["bumper"], icon: BumperIcon },
  { keywords: ["fender", "flare", "wheel arch"], icon: FenderIcon },
  { keywords: ["canard", "canards", "winglet"], icon: CanardIcon },
  { keywords: ["front splitter", "splitter"], icon: SplitterIcon },
  { keywords: ["diffuser"], icon: DiffuserIcon },
  { keywords: ["side skirt", "side skirts"], icon: SideSkirtIcon },
  { keywords: ["rocker panel", "rocker extension"], icon: RockerPanelIcon },
  { keywords: ["quarter panel"], icon: QuarterPanelIcon },
  { keywords: ["spoiler", "wing"], icon: SpoilerIcon },
  { keywords: ["mirror"], icon: MirrorIcon },

  // Lighting
  { keywords: ["fog light", "fog lamp"], icon: FogLightIcon },
  { keywords: ["taillight", "tail light", "brake light lens"], icon: TailLightIcon },
  { keywords: ["headlight", "head light", "drl"], icon: HeadlightIcon },
  { keywords: ["underglow", "under glow", "neon underbody"], icon: UnderglowIcon },
  { keywords: ["light bar", "led bar"], icon: LightBarIcon },
  { keywords: ["turn signal", "blinker", "indicator light"], icon: TurnSignalIcon },
  { keywords: ["ambient lighting", "interior lighting", "led interior"], icon: AmbientLightIcon },

  // Glass & roof
  { keywords: ["tint", "window film", "window tint"], icon: TintIcon },
  { keywords: ["windshield", "windscreen"], icon: WindshieldIcon },
  { keywords: ["window net"], icon: WindowNetIcon },
  { keywords: ["power window", "window regulator", "window motor", "window"], icon: WindowIcon },
  { keywords: ["roof rack", "cargo rack"], icon: RoofRackIcon },
  { keywords: ["sunroof", "moonroof", "hardtop", "t-top", "targa"], icon: RoofIcon },
  { keywords: ["trunk", "hatch", "tailgate"], icon: TrunkIcon },
  { keywords: ["fuel door", "gas cap", "filler cap", "fuel cap"], icon: FuelDoorIcon },
  { keywords: ["door"], icon: DoorIcon },
  { keywords: ["decal", "graphics", "stripe", "livery", "sticker"], icon: DecalIcon },
  { keywords: ["antenna", "shark fin"], icon: AntennaIcon },
  { keywords: ["emblem", "badge"], icon: BadgeIcon },
  { keywords: ["license plate", "plate frame"], icon: LicensePlateIcon },
  { keywords: ["wiper"], icon: WiperIcon },

  // Fuel
  { keywords: ["fuel pump"], icon: FuelPumpIcon },
  { keywords: ["fuel", "injector"], icon: FuelIcon },

  // Off-road & utility
  { keywords: ["tow hitch", "trailer hitch", "tow bar", "hitch"], icon: TowHitchIcon },
  { keywords: ["bull bar", "brush guard"], icon: BullBarIcon },
  { keywords: ["winch"], icon: WinchIcon },
  { keywords: ["snorkel"], icon: SnorkelIcon },
  { keywords: ["running board", "side step", "nerf bar"], icon: RunningBoardIcon },
  { keywords: ["ladder rack"], icon: LadderRackIcon },
  { keywords: ["tonneau cover", "bed cover", "truck bed cover"], icon: TonneauCoverIcon },
  { keywords: ["bed liner", "bedliner", "spray-in liner"], icon: BedlinerIcon },
  { keywords: ["convertible top", "soft top", "ragtop"], icon: ConvertibleTopIcon },
  { keywords: ["skid plate", "underbody armor", "bash plate"], icon: SkidPlateIcon },

  // Exhaust & induction
  { keywords: ["header", "exhaust manifold"], icon: HeaderIcon },
  { keywords: ["exhaust", "muffler", "cat-back", "catback", "downpipe", "resonator"], icon: ExhaustIcon },

  // Suspension & chassis
  { keywords: ["sway bar", "anti-roll bar"], icon: SwayBarIcon },
  { keywords: ["strut bar", "strut brace", "tower brace"], icon: StrutBraceIcon },
  { keywords: ["air suspension", "air bag", "air ride"], icon: AirSuspensionIcon },
  { keywords: ["lift kit", "leveling kit"], icon: LiftKitIcon },
  { keywords: ["bushing", "bushings"], icon: BushingIcon },
  { keywords: ["ball joint"], icon: BallJointIcon },
  { keywords: ["tie rod"], icon: TieRodIcon },
  { keywords: ["subframe", "sub-frame"], icon: SubframeIcon },
  { keywords: ["suspension", "coilover", "spring", "strut", "shock", "control arm", "chassis brace", "camber"], icon: SuspensionIcon },

  // Electrical — checked ahead of forced-induction/engine sections since
  // "boost" (turbo) and generic part words would otherwise swallow phrases
  // like "boost gauge" or "battery kill switch" first.
  { keywords: ["kill switch", "cutoff switch", "battery disconnect"], icon: KillSwitchIcon },
  { keywords: ["battery"], icon: BatteryIcon },
  { keywords: ["shift light"], icon: ShiftLightIcon },
  { keywords: ["gauge"], icon: GaugeIcon },
  { keywords: ["ecu", "tune", "tuning", "software", "chip", "flash", "piggyback"], icon: TuningIcon },
  { keywords: ["fuse box", "fuse"], icon: FuseBoxIcon },
  { keywords: ["electrical", "wiring"], icon: BoltIcon },

  // Forced induction
  { keywords: ["cold air intake", "intake manifold", "intake", "air filter", "air box"], icon: IntakeIcon },
  { keywords: ["wastegate"], icon: WastegateIcon },
  { keywords: ["blow off valve", "bov", "diverter valve"], icon: BovIcon },
  { keywords: ["turbo", "supercharger", "intercooler", "boost"], icon: TurboIcon },

  // Engine internals
  { keywords: ["throttle body"], icon: ThrottleBodyIcon },
  { keywords: ["camshaft", "cam gear", "cams"], icon: CamshaftIcon },
  { keywords: ["valve cover"], icon: ValveCoverIcon },
  { keywords: ["oil pan"], icon: OilPanIcon },
  { keywords: ["spark plug", "spark plugs"], icon: SparkPlugIcon },
  { keywords: ["ignition coil", "coil pack"], icon: IgnitionCoilIcon },
  { keywords: ["engine", "block", "piston", "head gasket"], icon: EngineIcon },

  // Cooling
  { keywords: ["oil filter"], icon: OilFilterIcon },
  { keywords: ["oil cooler"], icon: OilCoolerIcon },
  { keywords: ["cooling fan", "radiator fan", "fan shroud"], icon: FanIcon },
  { keywords: ["thermostat"], icon: ThermostatIcon },
  { keywords: ["radiator", "coolant", "cooling system"], icon: RadiatorIcon },

  // Drivetrain
  { keywords: ["timing belt", "timing chain"], icon: TimingBeltIcon },
  { keywords: ["serpentine belt", "drive belt", "accessory belt"], icon: DriveBeltIcon },
  { keywords: ["alternator"], icon: AlternatorIcon },
  { keywords: ["starter motor", "starter"], icon: StarterIcon },
  { keywords: ["differential", "limited slip", "lsd"], icon: DifferentialIcon },
  { keywords: ["transfer case"], icon: TransferCaseIcon },
  { keywords: ["clutch"], icon: ClutchIcon },
  { keywords: ["transmission", "gearbox", "driveshaft", "axle", "flywheel"], icon: TransmissionIcon },
  { keywords: ["nitrous", "nos", "n2o"], icon: NitrousIcon },

  // Tech & audio
  { keywords: ["dash cam", "dashcam"], icon: DashCamIcon },
  { keywords: ["backup camera", "reverse camera", "rear camera"], icon: BackupCameraIcon },
  { keywords: ["navigation", "gps", "nav unit"], icon: NavIcon },
  { keywords: ["head unit", "stereo receiver", "infotainment", "touchscreen radio"], icon: HeadUnitIcon },
  { keywords: ["subwoofer box", "sub box"], icon: SubwooferBoxIcon },
  { keywords: ["audio", "speaker", "stereo", "sound", "subwoofer", "amp"], icon: SpeakerIcon },
  { keywords: ["alarm", "security system", "immobilizer"], icon: AlarmIcon },
  { keywords: ["remote start", "remote starter"], icon: RemoteStartIcon },

  // Interior
  { keywords: ["floor mat", "floor liner"], icon: FloorMatIcon },
  { keywords: ["pedal"], icon: PedalIcon },
  { keywords: ["headliner"], icon: HeadlinerIcon },
  { keywords: ["center console", "console"], icon: ConsoleIcon },
  { keywords: ["sun visor", "visor"], icon: SunVisorIcon },
  { keywords: ["cup holder"], icon: CupHolderIcon },
  { keywords: ["fire extinguisher"], icon: FireExtinguisherIcon },
  { keywords: ["interior", "seat", "upholstery", "dash", "dashboard"], icon: SeatIcon },

  // Safety & racing
  { keywords: ["racing harness", "5-point harness", "harness"], icon: HarnessIcon },
  { keywords: ["roll cage", "roll bar", "cage"], icon: RollCageIcon },

  // Everything else exterior/aero
  { keywords: ["body kit", "widebody", "aero", "exterior", "body"], icon: BodyKitIcon },
];

export function getCategoryIcon(category: string | null, rawName: string): IconComponent {
  const haystack = `${category ?? ""} ${rawName}`.toLowerCase();
  for (const { keywords, icon } of CATEGORY_ICONS) {
    if (keywords.some((kw) => haystack.includes(kw))) return icon;
  }
  return WrenchIcon;
}
