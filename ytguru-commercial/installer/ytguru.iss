; YT Guru installer — Inno Setup 6.
; Build with:  python ytguru-commercial/installer/build.py   (it stages the files and calls ISCC)
;
; The setup file holds the app and an embeddable Python. During installation the essentials
; (Python packages, FFmpeg, Deno) are downloaded by setup_essentials.py, which resumes after a
; dropped connection. Big optional parts are downloaded later, only when the user asks.
;
; - PrivilegesRequired=lowest (per user, no UAC): the app writes its settings next to itself.
; - Unsigned: Windows SmartScreen shows "Windows protected your PC" -> More info -> Run anyway.
; - Same AppId as 1.0.x, so installing over an older version updates it (the launcher moves that
;   version's videos and settings to their new place at the first start).

#ifndef MyAppName
  #define MyAppName "YT Guru"
#endif
#ifndef OutputName
  #define OutputName "YTGuru-Setup"
#endif
#ifndef MyAppVersion
  #define MyAppVersion "1.0.8"
#endif
#ifndef Stage
  #error Pass /DStage=<staged folder> (build.py does)
#endif
#ifndef EssentialsMB
  #define EssentialsMB "250"
#endif
#define MyAppPublisher "YT Guru"
#define MyAppURL "https://github.com/amirowaisy72/youtube-cover-video-tool"
; the test build (build.py --test) has its own id, so it never touches a real installation
#ifndef MyAppId
  #define MyAppId "{3F2A1B4C-7D8E-4A1B-9C2D-5E6F7A8B9C0D}"
#endif

[Setup]
AppId={{#MyAppId}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName={localappdata}\{#MyAppName}
DisableDirPage=no
UsePreviousAppDir=yes
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
OutputDir=installer-output
OutputBaseFilename={#OutputName}-{#MyAppVersion}
SetupIconFile={#Stage}\ytguru.ico
UninstallDisplayIcon={app}\ytguru.ico
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ExtraDiskSpaceRequired=900000000
CloseApplications=no
SetupLogging=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[InstallDelete]
; program files of earlier versions (their videos and settings are moved by the launcher)
Type: files; Name: "{app}\YT-Guru.exe"
Type: filesandordirs; Name: "{app}\backend\__pycache__"
Type: filesandordirs; Name: "{app}\frontend-react\dist"

[Files]
Source: "{#Stage}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\python\pythonw.exe"; Parameters: """{app}\launcher.py"""; WorkingDir: "{app}"; IconFilename: "{app}\ytguru.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\python\pythonw.exe"; Parameters: """{app}\launcher.py"""; WorkingDir: "{app}"; IconFilename: "{app}\ytguru.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\python\pythonw.exe"; Parameters: """{app}\launcher.py"""; WorkingDir: "{app}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent; Check: EssentialsReady

[UninstallDelete]
; made after installation (never the data folder: uninstall_cleanup.py handles that, as chosen)
Type: filesandordirs; Name: "{app}\python"
Type: filesandordirs; Name: "{app}\bin"
Type: filesandordirs; Name: "{app}\backend\__pycache__"
Type: files; Name: "{app}\installed.json"
Type: files; Name: "{app}\launcher-error.log"
Type: files; Name: "{app}\setup-error.log"
Type: dirifempty; Name: "{app}\backend"
Type: dirifempty; Name: "{app}"

[Code]
const
  UninstallKey = 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppId}_is1';
  DataMarker = '.ytguru-data';

var
  ExistingVersion: String;
  DataPage: TInputDirWizardPage;
  CancelWanted, Downloading, KeepData: Boolean;

function GetDriveType(lpRootPathName: String): Cardinal;
  external 'GetDriveTypeW@kernel32.dll stdcall';

function FreeMB(Root: String; var MB: Cardinal): Boolean;
var
  Total: Cardinal;
begin
  Result := GetSpaceOnDisk(Root, True, MB, Total);
end;

// The fixed drive with the most free space; C: is suggested only when it is the roomiest
// and not running low.
function SuggestedData(var Note: String): String;
var
  I: Integer;
  Root, Best: String;
  MB, BestMB, SystemMB: Cardinal;
begin
  Best := '';
  BestMB := 0;
  SystemMB := 0;
  Note := '';
  for I := Ord('C') to Ord('Z') do
  begin
    Root := Chr(I) + ':\';
    if (GetDriveType(Root) = 3) and FreeMB(Root, MB) then
    begin
      Note := Note + Chr(I) + ': ' + IntToStr(MB div 1024) + ' GB free     ';
      if CompareText(Root, AddBackslash(ExpandConstant('{sd}'))) = 0 then
        SystemMB := MB
      else if MB > BestMB then
      begin
        Best := Root;
        BestMB := MB;
      end;
    end;
  end;
  if (Best <> '') and ((BestMB > SystemMB) or ((SystemMB < 30000) and (BestMB > 8000))) then
    Result := Best + 'YT Guru Data'
  else
    Result := ExpandConstant('{%USERPROFILE}') + '\YT Guru Data';
end;

// "data": "..." out of an earlier installed.json
function PreviousData(Folder: String): String;
var
  Raw: AnsiString;
  S: String;
  P: Integer;
begin
  Result := '';
  if not LoadStringFromFile(AddBackslash(Folder) + 'installed.json', Raw) then Exit;
  S := UTF8Decode(Raw);
  P := Pos('"data": "', S);
  if P = 0 then Exit;
  Delete(S, 1, P + 8);
  P := Pos('"', S);
  if P = 0 then Exit;
  S := Copy(S, 1, P - 1);
  StringChangeEx(S, '\\', '\', True);
  Result := S;
end;

function InitializeSetup(): Boolean;
begin
  if not RegQueryStringValue(HKCU, UninstallKey, 'DisplayVersion', ExistingVersion) then
    ExistingVersion := '';
  Result := True;
end;

procedure InitializeWizard();
var
  Note, Suggestion: String;
begin
  Suggestion := SuggestedData(Note);
  DataPage := CreateInputDirPage(wpSelectDir, 'Data folder', 'Where should videos and models be saved?',
    'Videos, voices and the optional downloads go here. They can need many gigabytes.' + #13#10 + #13#10 +
    'Your drives:  ' + Note, False, 'YT Guru Data');
  DataPage.Add('Data folder:');
  DataPage.Values[0] := Suggestion;
end;

procedure CurPageChanged(CurPageID: Integer);
var
  Old: String;
begin
  if CurPageID = DataPage.ID then
  begin
    Old := ExpandConstant('{param:DATADIR|}');
    if Old = '' then Old := PreviousData(WizardDirValue);
    if Old <> '' then DataPage.Values[0] := Old;
  end;
  if CurPageID = wpReady then
    if ExistingVersion <> '' then
      WizardForm.NextButton.Caption := 'Update'
    else
      WizardForm.NextButton.Caption := 'Install';
end;

// A folder with other things in it gets its own sub-folder: uninstalling must never touch them.
function OwnDataFolder(Chosen: String): String;
var
  Find: TFindRec;
  Used: Boolean;
begin
  Result := RemoveBackslashUnlessRoot(Trim(Chosen));
  if FileExists(AddBackslash(Result) + DataMarker) then Exit;
  if Length(Result) <= 3 then
  begin
    Result := AddBackslash(Result) + 'YT Guru Data';
    Exit;
  end;
  Used := False;
  if FindFirst(AddBackslash(Result) + '*', Find) then
  begin
    try
      repeat
        if (Find.Name <> '.') and (Find.Name <> '..') then Used := True;
      until Used or not FindNext(Find);
    finally
      FindClose(Find);
    end;
  end;
  if Used then Result := AddBackslash(Result) + 'YT Guru Data';
end;

function ChosenData(): String;
begin
  Result := ExpandConstant('{param:DATADIR|}');
  if Result = '' then Result := DataPage.Values[0];
  if Result = '' then Result := PreviousData(WizardDirValue);
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  Data: String;
begin
  Result := True;
  if CurPageID = DataPage.ID then
  begin
    Data := Trim(DataPage.Values[0]);
    if (Length(Data) < 3) or (Copy(Data, 2, 2) <> ':\') then
    begin
      MsgBox('Choose a folder on a drive of this PC, for example D:\YT Guru Data.', mbError, MB_OK);
      Result := False;
    end
    else if CompareText(AddBackslash(Data), AddBackslash(WizardDirValue)) = 0 then
    begin
      MsgBox('The data folder must be different from the install folder.', mbError, MB_OK);
      Result := False;
    end
    else
      DataPage.Values[0] := OwnDataFolder(Data);
  end;
end;

function UpdateReadyMemo(Space, NewLine, MemoUserInfo, MemoDirInfo, MemoTypeInfo, MemoComponentsInfo, MemoGroupInfo, MemoTasksInfo: String): String;
begin
  Result := '';
  if ExistingVersion <> '' then
    Result := 'Update: YT Guru ' + ExistingVersion + ' is installed — it will be updated to {#MyAppVersion}. Your videos, settings and license stay.' + NewLine + NewLine;
  Result := Result + MemoDirInfo + NewLine + NewLine;
  Result := Result + 'Data folder (videos and models):' + NewLine + Space + ChosenData() + NewLine + NewLine;
  Result := Result + 'Then downloaded now: about {#EssentialsMB} MB (Python packages, FFmpeg, Deno). If the connection drops, it continues where it stopped.' + NewLine + NewLine;
  if MemoTasksInfo <> '' then Result := Result + MemoTasksInfo;
end;

// Close a running YT Guru: its files cannot be replaced or removed while it runs.
procedure StopApp(Folder: String);
var
  Code: Integer;
  Command: String;
begin
  StringChangeEx(Folder, '''', '''''', True);
  Command := '-NoProfile -ExecutionPolicy Bypass -Command "Get-Process python,pythonw,ffmpeg,YT-Guru -ErrorAction SilentlyContinue | ' +
    'Where-Object { $_.Path -and $_.Path.StartsWith(''' + AddBackslash(Folder) + ''', [StringComparison]::OrdinalIgnoreCase) } | Stop-Process -Force"';
  Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'), Command, '', SW_HIDE, ewWaitUntilTerminated, Code);
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  Result := '';
  StopApp(ExpandConstant('{app}'));
  if not ForceDirectories(ChosenData()) then
    Result := 'The data folder cannot be created: ' + ChosenData() + #13#10 + 'Go back and choose another one.';
end;

procedure WriteSettings();
var
  Data, Escaped: String;
begin
  Data := ChosenData();
  ForceDirectories(Data);
  SaveStringToFile(AddBackslash(Data) + DataMarker, 'YT Guru data folder', False);
  Escaped := Data;
  StringChangeEx(Escaped, '\', '\\', True);
  SaveStringToFile(ExpandConstant('{app}\installed.json'),
    UTF8Encode('{"data": "' + Escaped + '", "version": "{#MyAppVersion}"}'), False);
end;

procedure CancelButtonClick(CurPageID: Integer; var Cancel, Confirm: Boolean);
begin
  if Downloading then
  begin
    Cancel := False;
    Confirm := False;
    if MsgBox('Stop downloading? What is already downloaded is kept, and YT Guru offers to continue when you open it.', mbConfirmation, MB_YESNO) = IDYES then
      CancelWanted := True;
  end;
end;

// Runs setup_essentials.py once and shows its progress. True = everything is there.
function DownloadOnce(Page: TOutputProgressWizardPage; var Problem: String): Boolean;
var
  Lines: TArrayOfString;
  StatusFile, CancelFile, Beat: String;
  Code, Quiet: Integer;
begin
  Result := False;
  Problem := 'The download step could not be started.';
  StatusFile := ExpandConstant('{tmp}\essentials-status.txt');
  CancelFile := ExpandConstant('{tmp}\essentials-cancel.txt');
  DeleteFile(StatusFile);
  DeleteFile(CancelFile);
  CancelWanted := False;
  if not Exec(ExpandConstant('{app}\python\python.exe'), '"' + ExpandConstant('{app}\setup_essentials.py') + '" --status "' + StatusFile +
    '" --cancel "' + CancelFile + '"', ExpandConstant('{app}'), SW_HIDE, ewNoWait, Code) then Exit;
  Beat := '';
  Quiet := 0;
  while True do
  begin
    Sleep(400);
    if CancelWanted then SaveStringToFile(CancelFile, 'cancel', False);
    if LoadStringsFromFile(StatusFile, Lines) and (GetArrayLength(Lines) >= 4) then
    begin
      Page.SetText('Downloading the files YT Guru needs. This runs once.', UTF8Decode(AnsiString(Lines[2])));
      Page.SetProgress(StrToIntDef(Lines[1], 0), 100);
      if Lines[0] = 'done' then
      begin
        Result := True;
        Exit;
      end;
      if Lines[0] = 'error' then
      begin
        Problem := UTF8Decode(AnsiString(Lines[2]));
        Exit;
      end;
      if Lines[3] = Beat then Quiet := Quiet + 1 else Quiet := 0;
      Beat := Lines[3];
    end
    else
    begin
      Page.SetProgress(0, 100);
      Quiet := Quiet + 1;
    end;
    if Quiet > 450 then  // three minutes without a sign of life
    begin
      Problem := 'The download step stopped answering. An antivirus program may have blocked it.';
      Exit;
    end;
  end;
end;

procedure DownloadEssentials();
var
  Page: TOutputProgressWizardPage;
  Problem: String;
  Again: Boolean;
begin
  Page := CreateOutputProgressPage('Downloading', 'About {#EssentialsMB} MB. If the connection drops, it continues where it stopped.');
  Page.Show;
  Downloading := True;
  try
    repeat
      Again := False;
      WizardForm.CancelButton.Visible := True;
      WizardForm.CancelButton.Enabled := True;
      if not DownloadOnce(Page, Problem) then
      begin
        Log('Essentials: ' + Problem);
        Again := SuppressibleMsgBox(Problem + #13#10 + #13#10 + 'Press Retry to continue the download, or Cancel to do it later (YT Guru will offer it when you open it).',
          mbError, MB_RETRYCANCEL, IDCANCEL) = IDRETRY;
      end;
    until not Again;
  finally
    Downloading := False;
    Page.Hide;
  end;
end;

function EssentialsReady(): Boolean;
begin
  Result := FileExists(ExpandConstant('{app}\python\essentials.ok'));
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    WriteSettings();
    DownloadEssentials();
  end;
end;

function GetCustomSetupExitCode(): Integer;
begin
  if EssentialsReady() then Result := 0 else Result := 20;
end;

// ---------------------------------------------------------------- uninstall
function InitializeUninstall(): Boolean;
var
  Answer: Integer;
begin
  Result := True;
  KeepData := True;
  if ExpandConstant('{param:DELETEDATA|0}') = '1' then
    KeepData := False
  else if not UninstallSilent() then
  begin
    Answer := MsgBox('Keep my videos and settings?' + #13#10 + #13#10 +
      'Yes — your videos, keys, settings and license stay on this PC (the large downloaded parts are removed).' + #13#10 +
      'No — remove everything, including your videos.', mbConfirmation, MB_YESNOCANCEL);
    if Answer = IDCANCEL then Result := False;
    if Answer = IDNO then
      KeepData := MsgBox('Really delete all your videos and settings? This cannot be undone.', mbConfirmation, MB_YESNO or MB_DEFBUTTON2) <> IDYES;
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  Code: Integer;
  Choice: String;
begin
  if CurUninstallStep = usUninstall then
  begin
    StopApp(ExpandConstant('{app}'));
    if KeepData then Choice := '--keep' else Choice := '--delete';
    if not Exec(ExpandConstant('{app}\python\python.exe'), '"' + ExpandConstant('{app}\uninstall_cleanup.py') + '" ' + Choice,
      ExpandConstant('{app}'), SW_HIDE, ewWaitUntilTerminated, Code) or (Code <> 0) then
      Log('Cleanup did not run: the data folder is left as it is.');
  end;
end;
