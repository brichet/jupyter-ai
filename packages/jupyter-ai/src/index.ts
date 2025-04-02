import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  IWidgetTracker,
  ReactWidget,
  IThemeManager,
  MainAreaWidget,
  ICommandPalette
} from '@jupyterlab/apputils';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { chatCommandPlugins } from './chat-commands';
import { completionPlugin } from './completions';
import { statusItemPlugin } from './status';
import { IJaiCompletionProvider } from './tokens';
import { buildErrorWidget } from './widgets/chat-error';
import { buildAiSettings } from './widgets/settings-widget';
import { ChatWidgetFactory, IChatFactory, LabChatPanel } from 'jupyterlab-chat';
import { IChatModel, IInputToolbarRegistry, IUser } from '@jupyter/chat';
import { stopItem } from './components/input-toolbar/stop-button';

export type DocumentTracker = IWidgetTracker<IDocumentWidget>;

export namespace CommandIDs {
  /**
   * Command to open the AI settings.
   */
  export const openAiSettings = 'jupyter-ai:open-settings';
}

/**
 * Initialization data for the jupyter_ai extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyter-ai/core:plugin',
  autoStart: true,
  requires: [IRenderMimeRegistry],
  optional: [ICommandPalette, IThemeManager, IJaiCompletionProvider],
  activate: async (
    app: JupyterFrontEnd,
    rmRegistry: IRenderMimeRegistry,
    palette: ICommandPalette | null,
    themeManager: IThemeManager | null,
    completionProvider: IJaiCompletionProvider | null
  ) => {
    const openInlineCompleterSettings = () => {
      app.commands.execute('settingeditor:open', {
        query: 'Inline Completer'
      });
    };

    // Create a AI settings widget.
    let aiSettings: MainAreaWidget<ReactWidget>;
    let settingsWidget: ReactWidget;
    try {
      settingsWidget = buildAiSettings(
        themeManager,
        rmRegistry,
        completionProvider,
        openInlineCompleterSettings
      );
    } catch (e) {
      settingsWidget = buildErrorWidget(themeManager);
    }

    // Add a command to open settings widget in main area.
    app.commands.addCommand(CommandIDs.openAiSettings, {
      execute: () => {
        if (!aiSettings || aiSettings.isDisposed) {
          aiSettings = new MainAreaWidget({ content: settingsWidget });
          aiSettings.id = 'jupyter-ai-settings';
          aiSettings.title.label = 'AI settings';
          aiSettings.title.closable = true;
        }
        if (!aiSettings.isAttached) {
          app?.shell.add(aiSettings, 'main');
        }
        app.shell.activateById(aiSettings.id);
      },
      label: 'AI settings'
    });

    if (palette) {
      palette.addItem({
        category: 'jupyter-ai',
        command: CommandIDs.openAiSettings
      });
    }
  }
};

const stopStreaming: JupyterFrontEndPlugin<void> = {
  id: '@jupyter-ai/core:stop-streaming',
  autoStart: true,
  requires: [IChatFactory],
  activate: (app: JupyterFrontEnd, factory: IChatFactory) => {
    // Toggle the stop button visibility.
    function toggleStopButton(
      registry: IInputToolbarRegistry,
      state: boolean
    ): void {
      if (state) {
        registry.hide('send');
        registry.hide('attach');
        registry.show('stop');
      } else {
        registry.hide('stop');
        registry.show('send');
        registry.show('attach');
      }
    }

    // Add the stop button to the input toolbar registry when a new chat is created.
    factory.tracker.widgetAdded.connect((_, widget) => {
      let registry: IInputToolbarRegistry | undefined;

      if (widget instanceof LabChatPanel) {
        // Chat in the main area.
        registry = (widget.context as ChatWidgetFactory.IContext)
          .inputToolbarRegistry;
      } else {
        // Chat in the side panel.
        registry = widget.inputToolbarRegistry;
      }
      if (registry) {
        let stopButtonVisible = false;

        // Triggered when the current writers changed.
        const writersChanged = (_: IChatModel, users: IUser[]) => {
          if (!registry) {
            return;
          }
          // TODO: get the bot name if it is customizable
          const botResponding =
            users.filter(user => user.name === 'Jupyternaut').length > 0;
          if (botResponding && !stopButtonVisible) {
            stopButtonVisible = true;
            toggleStopButton(registry, stopButtonVisible);
          } else if (!botResponding && stopButtonVisible) {
            stopButtonVisible = false;
            toggleStopButton(registry, stopButtonVisible);
          }
        };

        // Add the stop button to the registry.
        registry.addItem('stop', stopItem(widget.model));

        // Listen to the writers in the chat.
        widget.model.writersChanged?.connect(writersChanged);

        widget.disposed.connect(() => {
          widget.model.writersChanged?.disconnect(writersChanged);
        });
      }
    });
  }
};

export default [
  plugin,
  statusItemPlugin,
  completionPlugin,
  stopStreaming,
  ...chatCommandPlugins
];

export * from './contexts';
export * from './tokens';
