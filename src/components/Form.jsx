/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { PREDEFINED_RULE_SETS, UNIFIED_RULES } from "../config/index.js";
import { CustomRules } from "./CustomRules.jsx";
import { TextareaWithActions } from "./TextareaWithActions.jsx";
import { ValidatedTextarea } from "./ValidatedTextarea.jsx";
import { formLogicFn } from "./formLogic.js";

const LINK_FIELDS = [
  { key: "xray", labelKey: "xrayLink" },
  { key: "singbox", labelKey: "singboxLink" },
  { key: "clash", labelKey: "clashLink" },
  { key: "surge", labelKey: "surgeLink" },
];

export const Form = (props) => {
  const { t, lang } = props;

  const translations = {
    processing: t("processing"),
    convert: t("convert"),
    saveConfigSuccess: t("saveConfigSuccess"),
    saveConfig: t("saveConfig"),
    savingConfig: t("savingConfig"),
    configContentRequired: t("configContentRequired"),
    configSaveFailed: t("configSaveFailed"),
    confirmClearConfig: t("confirmClearConfig"),
    confirmClearAll: t("confirmClearAll"),
    errorGeneratingLinks: t("errorGeneratingLinks"),
    shortenLinks: t("shortenLinks"),
    shortening: t("shortening"),
    alreadyShortened: t("alreadyShortened"),
    shortenFailed: t("shortenFailed"),
    customShortCode: t("customShortCode"),
    optional: t("optional"),
    customShortCodePlaceholder: t("customShortCodePlaceholder"),
    showFullLinks: t("showFullLinks"),
  };

  const scriptContent = `
    window.APP_TRANSLATIONS = ${JSON.stringify(translations)};
    window.PREDEFINED_RULE_SETS = ${JSON.stringify(PREDEFINED_RULE_SETS)};
    window.APP_LANG = ${JSON.stringify(lang || "zh-CN")};
    (${formLogicFn.toString()})();
  `;

  const SidebarPanels = () => (
    <div class="space-y-6">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <i class="fas fa-history text-gray-400"></i>
            {t("conversionHistory")}
          </h3>
          <button
            type="button"
            x-on:click="clearHistory()"
            x-show="conversionHistory && conversionHistory.length"
            class="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            {t("clear")}
          </button>
        </div>

        <template x-if="!conversionHistory || conversionHistory.length === 0">
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {t("noHistory")}
          </p>
        </template>

        <div
          class="space-y-2 max-h-[60vh] overflow-auto pr-1"
          x-show="conversionHistory && conversionHistory.length"
        >
          <template x-for="item in conversionHistory" x-bind:key="item.id">
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="flex-1 text-left px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-300 hover:border-primary-200 dark:hover:border-primary-900/60 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors truncate"
                x-text="item.label"
                x-on:click="restoreHistoryEntry(item.id)"
              ></button>
              <button
                type="button"
                class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors shrink-0"
                x-on:click="removeHistoryEntry(item.id)"
                title="Remove"
              >
                <i class="fas fa-times text-xs"></i>
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>
  );

  return (
    <div x-data="formData()" x-init="init()" class="max-w-4xl mx-auto">
      <div>
        {/* Mobile History Button */}
        <button
          type="button"
          class="lg:hidden fixed bottom-6 right-6 z-40 bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 transition-colors"
          {...{ "x-on:click": "showHistorySidebar = true" }}
        >
          <i class="fas fa-history text-xl"></i>
        </button>

        {/* Desktop History Button */}
        <button
          type="button"
          class="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-white dark:bg-gray-800 p-3 pr-4 pl-3 rounded-l-xl shadow-[0_0_15px_rgba(0,0,0,0.1)] border border-r-0 border-gray-200 dark:border-gray-700 items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
          {...{ "x-on:click": "showHistorySidebar = true" }}
          {...{ "x-show": "!showHistorySidebar" }}
        >
          <i class="fas fa-history text-primary-500 group-hover:scale-110 transition-transform"></i>
        </button>

        {/* Sidebar Backdrop */}
        <div
          class="fixed inset-0 bg-black/40 z-40 lg:bg-transparent lg:pointer-events-none transition-opacity"
          {...{ "x-show": "showHistorySidebar" }}
          {...{ "x-transition.opacity": true }}
          {...{ "x-on:click": "showHistorySidebar = false" }}
          style="display: none;"
        ></div>

        {/* Sidebar Drawer */}
        <aside
          class="fixed inset-y-0 right-0 z-50 w-80 bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out overflow-y-auto"
          {...{
            "x-bind:class":
              "showHistorySidebar ? 'translate-x-0' : 'translate-x-full'",
          }}
        >
          <div class="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur z-10">
            <h3 class="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <i class="fas fa-history text-primary-500"></i>
              <span x-text="t('history.title')"></span>
            </h3>
            <button
              type="button"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              {...{ "x-on:click": "showHistorySidebar = false" }}
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="p-4 space-y-6">
            <SidebarPanels />
          </div>
        </aside>

        <div class="min-w-0 max-w-4xl mx-auto pt-6">
          <form {...{ "x-on:submit.prevent": "submitForm" }} class="space-y-8">
            {/* Input Section */}
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all duration-300 hover:shadow-md group">
              <TextareaWithActions
                id="input"
                name="input"
                label={t("shareUrls")}
                labelPrefix={
                  <span class="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                    <i class="fas fa-link text-sm"></i>
                  </span>
                }
                model="input"
                rows={5}
                placeholder={t("urlPlaceholder")}
                required
                labelActionsWrapperClass="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                labelActions={[
                  {
                    key: "paste",
                    icon: "fas fa-paste",
                    label: t("paste"),
                    hideLabelOnMobile: true,
                    className:
                      "px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1",
                    title: t("paste"),
                    attrs: {
                      "x-on:click":
                        "navigator.clipboard.readText().then(text => input = text).catch(() => {})",
                    },
                  },
                  {
                    key: "clear",
                    icon: "fas fa-times",
                    label: t("clear"),
                    hideLabelOnMobile: true,
                    className:
                      "px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-1",
                    title: t("clear"),
                    attrs: {
                      "x-on:click": "input = ''",
                      "x-show": "input",
                    },
                  },
                ]}
              />
            </div>

            {/* Advanced Options Toggle */}
            <div
              class="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              x-on:click="showAdvanced = !showAdvanced"
              role="button"
              tabindex="0"
              {...{
                "x-on:keydown.enter.prevent": "showAdvanced = !showAdvanced",
                "x-on:keydown.space.prevent": "showAdvanced = !showAdvanced",
              }}
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                  <i class="fas fa-sliders-h"></i>
                </div>
                <span class="font-semibold text-gray-900 dark:text-white">
                  {t("advancedOptions")}
                </span>
              </div>
              <div
                class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 transition-transform duration-300"
                x-bind:class="{'rotate-180': showAdvanced}"
              >
                <i class="fas fa-chevron-down"></i>
              </div>
            </div>

            {/* Advanced Options Content */}
            <div
              x-show="showAdvanced"
              {...{
                "x-transition:enter": "transition ease-out duration-300",
                "x-transition:enter-start":
                  "opacity-0 transform -translate-y-4",
                "x-transition:enter-end": "opacity-100 transform translate-y-0",
                "x-transition:leave": "transition ease-in duration-200",
                "x-transition:leave-start":
                  "opacity-100 transform translate-y-0",
                "x-transition:leave-end": "opacity-0 transform -translate-y-4",
              }}
              class="space-y-6"
            >
              {/* Rule Selection */}
              <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <i class="fas fa-filter text-gray-400"></i>
                    {t("ruleSelection")}
                  </h3>
                  <select
                    x-model="selectedPredefinedRule"
                    x-on:change="applyPredefinedRule()"
                    class="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="custom">{t("custom")}</option>
                    <option value="minimal">{t("minimal")}</option>
                    <option value="balanced">{t("balanced")}</option>
                    <option value="comprehensive">{t("comprehensive")}</option>
                  </select>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {UNIFIED_RULES.map((rule) => (
                    <label class="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors group">
                      <input
                        type="checkbox"
                        value={rule.name}
                        x-model="selectedRules"
                        x-on:change="selectedPredefinedRule = 'custom'"
                        class="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span class="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                        {t(`outboundNames.${rule.name}`)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom Rules Component */}
              <CustomRules t={t} />

              {/* General Options */}
              <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <i class="fas fa-cog text-gray-400"></i>
                  {t("generalSettings")}
                </h3>

                <div class="space-y-4">
                  <label class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                    <span class="font-medium text-gray-700 dark:text-gray-300">
                      {t("groupByCountry")}
                    </span>
                    <div class="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        x-model="groupByCountry"
                        class="sr-only peer"
                      />
                      <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                    </div>
                  </label>

                  <label class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                    <span class="font-medium text-gray-700 dark:text-gray-300">
                      {t("includeAutoSelect")}
                    </span>
                    <div class="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        x-model="includeAutoSelect"
                        class="sr-only peer"
                      />
                      <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                    </div>
                  </label>

                  <label class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                    <span class="font-medium text-gray-700 dark:text-gray-300">
                      {t("enableClashUI")}
                    </span>
                    <div class="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        x-model="enableClashUI"
                        class="sr-only peer"
                      />
                      <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                    </div>
                  </label>

                  <div
                    x-show="enableClashUI"
                    {...{
                      "x-transition:enter": "transition ease-out duration-200",
                      "x-transition:enter-start":
                        "opacity-0 transform -translate-y-2",
                      "x-transition:enter-end":
                        "opacity-100 transform translate-y-0",
                      "x-transition:leave": "transition ease-in duration-150",
                      "x-transition:leave-start":
                        "opacity-100 transform translate-y-0",
                      "x-transition:leave-end":
                        "opacity-0 transform -translate-y-2",
                    }}
                    class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2"
                  >
                    <div>
                      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t("externalController")}
                      </label>
                      <input
                        type="text"
                        x-model="externalController"
                        class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder={t("externalControllerPlaceholder")}
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t("externalUiDownloadUrl")}
                      </label>
                      <input
                        type="text"
                        x-model="externalUiDownloadUrl"
                        class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder={t("externalUiDownloadUrlPlaceholder")}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Subconverter External Config */}
              <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                  <i class="fas fa-file-export text-gray-400"></i>
                  {t("subconverterConfigTitle")}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {t("subconverterConfigDesc")}
                </p>
                <div class="px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <p
                    class="font-mono text-sm text-gray-600 dark:text-gray-400 break-all"
                    x-text="getSubconverterUrl()"
                  ></p>
                </div>
                <div class="mt-3 flex justify-end">
                  <button
                    type="button"
                    x-on:click="copySubconverterUrl()"
                    class="px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
                    x-bind:class="subconverterCopied ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'"
                  >
                    <i
                      class="fas"
                      x-bind:class="subconverterCopied ? 'fa-check' : 'fa-copy'"
                    ></i>
                    <span
                      x-text={`subconverterCopied ? '${t("copiedSubconverterUrl")}' : '${t("copySubconverterUrl")}'`}
                    ></span>
                  </button>
                </div>
              </div>

              {/* User Agent */}
              <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <i class="fas fa-user-secret text-gray-400"></i>
                  {t("UASettings")}
                </h3>
                <input
                  type="text"
                  x-model="customUA"
                  class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="curl/7.74.0"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div class="flex flex-col sm:flex-row gap-4">
              <button
                type="submit"
                class="flex-1 py-3.5 px-6 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
                x-bind:disabled="loading"
              >
                <i
                  class="fas fa-sync-alt"
                  x-bind:class="loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'"
                ></i>
                <span x-text="loading ? processingText : convertText">
                  {t("convert")}
                </span>
              </button>

              <button
                type="button"
                x-on:click="clearAll()"
                class="px-6 py-3.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
              >
                <i class="fas fa-trash-alt"></i>
                {t("clear")}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Results Section */}
      <div
        x-cloak
        x-show="generatedLinks"
        x-data="{ copied: null }"
        {...{
          "x-transition:enter": "transition ease-out duration-500",
          "x-transition:enter-start": "opacity-0 transform translate-y-8",
          "x-transition:enter-end": "opacity-100 transform translate-y-0",
        }}
        class="mt-12"
      >
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8 transition-all duration-300 hover:shadow-md">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span class="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center">
                <i class="fas fa-link text-sm"></i>
              </span>
              {t("subscriptionLinks")}
            </h2>
          </div>

          <div class="mt-6 space-y-4">
            {LINK_FIELDS.map((field) => (
              <div class="relative group" key={field.key}>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t(field.labelKey)}
                </label>
                <div class="flex gap-2">
                  <input
                    type="text"
                    readonly
                    x-bind:value={`shortenedLinks ? shortenedLinks?.${field.key} : generatedLinks?.${field.key}`}
                    class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:border-transparent transition-all duration-200 font-mono text-sm"
                    x-bind:class="shortenedLinks ? 'text-primary-600 dark:text-primary-400 font-semibold focus:ring-primary-500' : 'text-gray-600 dark:text-gray-400 focus:ring-green-500'"
                  />
                  <button
                    type="button"
                    class="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                    x-bind:class={`{
                  'hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600 dark:hover:text-green-400': !shortenedLinks,
                  'hover:bg-primary-100 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400': shortenedLinks,
                  'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400': !shortenedLinks && copied === '${field.key}',
                  'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400': shortenedLinks && copied === '${field.key}'
                }`}
                  >
                    <i
                      class="fas"
                      x-bind:class={`copied === '${field.key}' ? 'fa-check' : 'fa-copy'`}
                    ></i>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Shortening Controls */}
          <div class="mt-6">
            <div class="flex flex-col items-center gap-3">
              <div class="w-full max-w-md">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
                  {t("customShortCode")}{" "}
                  <span class="text-gray-400">({t("optional")})</span>
                </label>
                <input
                  type="text"
                  x-model="customShortCode"
                  placeholder={t("customShortCodePlaceholder")}
                  class="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-center"
                />
              </div>
            </div>
            <div class="flex justify-center mt-4">
              <button
                type="button"
                x-on:click="shortenedLinks ? shortenedLinks = null : shortenLinks()"
                x-bind:disabled="!shortenedLinks && shortening"
                class="px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg"
                x-bind:class="shortenedLinks
              ? 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm'
              : 'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white shadow-primary-500/30 hover:shadow-primary-500/40 disabled:opacity-50 disabled:cursor-not-allowed'"
              >
                <i
                  class="fas"
                  x-bind:class="shortenedLinks ? 'fa-expand-alt' : (shortening ? 'fa-spinner fa-spin' : 'fa-compress-alt')"
                ></i>
                <span x-text="shortenedLinks ? showFullLinksText : (shortening ? shorteningText : shortenLinksText)"></span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: scriptContent }} />
    </div>
  );
};
