// Import as modules and expose a fallback to either named export ReactComponent or default export.
import * as PlusSvg from "./plus.svg?component";
import * as CloseSvg from "./close.svg?component";
import * as BoxSvg from "./box.svg?component";
import * as CheckCircleSvg from "./check-circle.svg?component";
import * as AlertSvg from "./alert.svg?component";
import * as InfoSvg from "./info.svg?component";
import * as ErrorSvg from "./info-error.svg?component";
import * as BoltSvg from "./bolt.svg?component";
import * as ArrowUpSvg from "./arrow-up.svg?component";
import * as ArrowDownSvg from "./arrow-down.svg?component";
import * as FolderSvg from "./folder.svg?component";
import * as VideoSvg from "./videos.svg?component";
import * as AudioSvg from "./audio.svg?component";
import * as GridSvg from "./grid.svg?component";
import * as FileSvg from "./file.svg?component";
import * as DownloadSvg from "./download.svg?component";
import * as ArrowRightSvg from "./arrow-right.svg?component";
import * as GroupSvg from "./group.svg?component";
import * as BoxIconLineSvg from "./box-line.svg?component";
import * as ShootingStarSvg from "./shooting-star.svg?component";
import * as DollarLineSvg from "./dollar-line.svg?component";
import * as TrashBinSvg from "./trash.svg?component";
import * as AngleUpSvg from "./angle-up.svg?component";
import * as AngleDownSvg from "./angle-down.svg?component";
import * as AngleLeftSvg from "./angle-left.svg?component";
import * as AngleRightSvg from "./angle-right.svg?component";
import * as PencilSvg from "./pencil.svg?component";
import * as CheckLineSvg from "./check-line.svg?component";
import * as CloseLineSvg from "./close-line.svg?component";
import * as ChevronDownSvg from "./chevron-down.svg?component";
import * as ChevronUpSvg from "./chevron-up.svg?component";
import * as PaperPlaneSvg from "./paper-plane.svg?component";
import * as LockSvg from "./lock.svg?component";
import * as EnvelopeSvg from "./envelope.svg?component";
import * as UserSvg from "./user-line.svg?component";
import * as CalenderSvg from "./calender-line.svg?component";
import * as EyeSvg from "./eye.svg?component";
import * as EyeCloseSvg from "./eye-close.svg?component";
import * as TimeSvg from "./time.svg?component";
import * as CopySvg from "./copy.svg?component";
import * as ChevronLeftSvg from "./chevron-left.svg?component";
import * as UserCircleSvg from "./user-circle.svg?component";
import * as TaskSvg from "./task-icon.svg?component";
import * as ListSvg from "./list.svg?component";
import * as TableSvg from "./table.svg?component";
import * as PageSvg from "./page.svg?component";
import * as PieChartSvg from "./pie-chart.svg?component";
import * as BoxCubeSvg from "./box-cube.svg?component";
import * as PlugInSvg from "./plug-in.svg?component";
import * as DocsSvg from "./docs.svg?component";
import * as MailSvg from "./mail-line.svg?component";
import * as HorizontaLDotsSvg from "./horizontal-dots.svg?component";
import * as ChatSvg from "./chat.svg?component";
import * as MoreDotSvg from "./moredot.svg?component";
import * as AlertHexaSvg from "./alert-hexa.svg?component";
import * as ErrorHexaSvg from "./info-hexa.svg?component";

import React from "react";

const createIcon = (mod: any) => {
  const Comp = mod?.ReactComponent || mod?.default;
  const Icon: React.FC<any> = (props) => {
    if (!Comp) return null;
    if (typeof Comp === "string") {
      return <img src={Comp} {...props} alt="" />;
    }
    const C = Comp as React.FC<any>;
    return <C {...props} />;
  };
  return Icon;
};

const PlusIcon = createIcon(PlusSvg);
const CloseIcon = createIcon(CloseSvg);
const BoxIcon = createIcon(BoxSvg);
const CheckCircleIcon = createIcon(CheckCircleSvg);
const AlertIcon = createIcon(AlertSvg);
const InfoIcon = createIcon(InfoSvg);
const ErrorIcon = createIcon(ErrorSvg);
const BoltIcon = createIcon(BoltSvg);
const ArrowUpIcon = createIcon(ArrowUpSvg);
const ArrowDownIcon = createIcon(ArrowDownSvg);
const FolderIcon = createIcon(FolderSvg);
const VideoIcon = createIcon(VideoSvg);
const AudioIcon = createIcon(AudioSvg);
const GridIcon = createIcon(GridSvg);
const FileIcon = createIcon(FileSvg);
const DownloadIcon = createIcon(DownloadSvg);
const ArrowRightIcon = createIcon(ArrowRightSvg);
const GroupIcon = createIcon(GroupSvg);
const BoxIconLine = createIcon(BoxIconLineSvg);
const ShootingStarIcon = createIcon(ShootingStarSvg);
const DollarLineIcon = createIcon(DollarLineSvg);
const TrashBinIcon = createIcon(TrashBinSvg);
const AngleUpIcon = createIcon(AngleUpSvg);
const AngleDownIcon = createIcon(AngleDownSvg);
const AngleLeftIcon = createIcon(AngleLeftSvg);
const AngleRightIcon = createIcon(AngleRightSvg);
const PencilIcon = createIcon(PencilSvg);
const CheckLineIcon = createIcon(CheckLineSvg);
const CloseLineIcon = createIcon(CloseLineSvg);
const ChevronDownIcon = createIcon(ChevronDownSvg);
const ChevronUpIcon = createIcon(ChevronUpSvg);
const PaperPlaneIcon = createIcon(PaperPlaneSvg);
const LockIcon = createIcon(LockSvg);
const EnvelopeIcon = createIcon(EnvelopeSvg);
const UserIcon = createIcon(UserSvg);
const CalenderIcon = createIcon(CalenderSvg);
const EyeIcon = createIcon(EyeSvg);
const EyeCloseIcon = createIcon(EyeCloseSvg);
const TimeIcon = createIcon(TimeSvg);
const CopyIcon = createIcon(CopySvg);
const ChevronLeftIcon = createIcon(ChevronLeftSvg);
const UserCircleIcon = createIcon(UserCircleSvg);
const TaskIcon = createIcon(TaskSvg);
const ListIcon = createIcon(ListSvg);
const TableIcon = createIcon(TableSvg);
const PageIcon = createIcon(PageSvg);
const PieChartIcon = createIcon(PieChartSvg);
const BoxCubeIcon = createIcon(BoxCubeSvg);
const PlugInIcon = createIcon(PlugInSvg);
const DocsIcon = createIcon(DocsSvg);
const MailIcon = createIcon(MailSvg);
const HorizontaLDots = createIcon(HorizontaLDotsSvg);
const ChatIcon = createIcon(ChatSvg);
const MoreDotIcon = createIcon(MoreDotSvg);
const AlertHexaIcon = createIcon(AlertHexaSvg);
const ErrorHexaIcon = createIcon(ErrorHexaSvg);

export {
  ErrorHexaIcon,
  AlertHexaIcon,
  MoreDotIcon,
  DownloadIcon,
  FileIcon,
  GridIcon,
  AudioIcon,
  VideoIcon,
  BoltIcon,
  PlusIcon,
  BoxIcon,
  CloseIcon,
  CheckCircleIcon,
  AlertIcon,
  InfoIcon,
  ErrorIcon,
  ArrowUpIcon,
  FolderIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  GroupIcon,
  BoxIconLine,
  ShootingStarIcon,
  DollarLineIcon,
  TrashBinIcon,
  AngleUpIcon,
  AngleDownIcon,
  PencilIcon,
  CheckLineIcon,
  CloseLineIcon,
  ChevronDownIcon,
  PaperPlaneIcon,
  EnvelopeIcon,
  LockIcon,
  UserIcon,
  CalenderIcon,
  EyeIcon,
  EyeCloseIcon,
  TimeIcon,
  CopyIcon,
  ChevronLeftIcon,
  UserCircleIcon,
  TaskIcon,
  ListIcon,
  TableIcon,
  PageIcon,
  PieChartIcon,
  BoxCubeIcon,
  PlugInIcon,
  DocsIcon,
  MailIcon,
  HorizontaLDots,
  ChevronUpIcon,
  ChatIcon,
  AngleLeftIcon,
  AngleRightIcon,
};

