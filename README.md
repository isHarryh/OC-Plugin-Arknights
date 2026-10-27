# OC-Plugin-Arknights

Arknights Theming Plugin for OpenCode  
OpenCode《明日方舟》主题插件

![NPM Version](https://img.shields.io/npm/v/oc-plugin-arknights)

## Intro

Brings visual and audio theming of the game **Arknights** to the OpenCode TUI:

- Draws a camp logo on the home screen (48 camp logos available).
- Maps OpenCode's attention events to Arknights base voice lines.

## Compatibility

| Plugin version | OpenCode version tested |
| -------------- | ----------------------- |
| `0.3.x`        | `2.2+`                  |
| `0.2.x`        | `2.0` \~ `2.1`          |
| `0.1.x`        | `1.18` \~ `1.19`        |

### Migrate from 0.2.x

The current release targets **OpenCode 2.2+**. Upgrading from 0.2.x needs no configuration change

### Migrate from 0.1.x

- **Logo position**: The logo is drawn above the built-in home footer, because OpenCode V2
  has no dedicated home logo slot yet ([#51916](https://github.com/anomalyco/opencode/issues/51916)).
  It moves to the logo slot once upstream provides one.
- **Config storage**: The plugin storage backend changed, so previous settings are not migrated.

## Usage

### Installation

Add the plugin to the global **CLI config** (`~/.config/opencode/cli.json`):

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    {
      "package": "oc-plugin-arknights@0.3",
      "options": { "enabled": true }
    }
  ]
}
```

### Options

| Option                | Default    | Description                                                                |
| --------------------- | ---------- | -------------------------------------------------------------------------- |
| `enabled`             | `true`     | Load the plugin at all.                                                    |
| `logo.enabled`        | `true`     | Draw the customized Arknights home logo.                                   |
| `logo.padding`        | `"large"`  | Space reserved around the logo: `"large"` = 16 cells, `"small"` = 8 cells. |
| `logo.mode`           | `"random"` | `"random"` picks a camp on every redraw, `"fixed"` uses `logo.selected`.   |
| `logo.selected`       | `"rhodes"` | Camp id for `"fixed"` mode, e.g. `rhodes`, `rhine`, `penguin`, `victoria`. |
| `sound_pack.enabled`  | `true`     | Enable the OpenCode's attention sounds.                                    |
| `sound_pack.override` | `true`     | Override OpenCode's attention sounds with Arknights sound pack.            |

### Commands

The command palette (`Ctrl+P`) lists three entries under the **Arknights** group:

- **Customize home logo**: draw the logo or not, reserved padding, fixed or random pick, and which camp.
- **Customize sound**: sound pack on/off, override, and which voice line each attention event plays.
- **Apply sound config**: writes the sound settings into the global `cli.json`, which the TUI reloads on change.

## Development

```sh
pnpm install
pnpm typecheck
```

## Licensing

This project is licensed under the MIT License. See the [License](https://github.com/isHarryh/OC-Plugin-Arknights/blob/main/LICENSE) file for more details.
