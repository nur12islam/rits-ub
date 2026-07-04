export const COMMAND_MAP: any = {
  administration: {
    title: "🛡️ Administration",
    categories: {
      user_management: {
        title: "👤 User Management",
        commands: [
          "ban",
          "unban",
          "mute",
          "unmute",
          "kick",
          "promote",
          "demote",
          "block",
          "unblock"
        ]
      },
      sudo_management: {
        title: "👑 Sudo Management",
        commands: [
          "addsudo",
          "rmsudo",
          "sudolist"
        ]
      },
      chat_management: {
        title: "💬 Chat Management",
        commands: [
          "join",
          "leave",
          "addbot",
          "pin",
          "gpic",
          "smode",
          "zombies"
        ]
      },
      moderation: {
        title: "🧹 Moderation",
        commands: [
          "purge",
          "tagall"
        ]
      }
    }
  },

  automation: {
    title: "🤖 Automation",
    categories: {
      notes: {
        title: "📝 Notes",
        commands: [
          "save",
          "get",
          "clear",
          "notes"
        ]
      },
      filters: {
        title: "🔖 Filters",
        commands: [
          "filter",
          "stop",
          "filters"
        ]
      },
      broadcast: {
        title: "📢 Broadcast",
        commands: [
          "gcast"
        ]
      }
    }
  },

  pmpermit: {
    title: "📩 PM Permit",
    commands: [
      "allow",
      "nopm",
      "listpm",
      "pmguard",
      "setpmmsg",
      "setbpmmsg",
      "setpmlimit",
      "vpmmsg",
      "vbpmmsg"
    ]
  },

  account: {
    title: "👤 Account",
    categories: {
      profile: {
        title: "🪪 Profile",
        commands: [
          "setname",
          "setbio"
        ]
      },
      status: {
        title: "💤 Status",
        commands: [
          "afk",
          "alive",
          "setalive",
          "ping"
        ]
      }
    }
  },

  information: {
    title: "ℹ️ Information",
    commands: [
      "help",
      "id",
      "sysinfo",
      "sg"
    ]
  },

  search: {
    title: "🔍 Search",
    categories: {
      web: {
        title: "🌐 Web Search",
        commands: [
          "google",
          "wiki",
          "dict",
          "ud"
        ]
      },
      developer: {
        title: "👨‍💻 Developer Search",
        commands: [
          "github"
        ]
      }
    }
  },

  utilities: {
    title: "🛠️ Utilities",
    categories: {
      network: {
        title: "🌍 Network",
        commands: [
          "weather",
          "ip",
          "speedtest"
        ]
      },
      security: {
        title: "🔐 Security",
        commands: [
          "hash",
          "uuid",
          "b64en",
          "b64de"
        ]
      },
      tools: {
        title: "📐 Tools",
        commands: [
          "calc",
          "crypto",
          "short",
          "ocr",
          "paste",
          "getpaste",
          "cbutton",
          "tr",
          "tts"
        ]
      },
      media: {
        title: "🎞️ Media",
        commands: [
          "ytinfo",
          "ytdes",
          "ytdl",
          "rmbg",
          "webss",
          "plet",
          "kang",
          "stkrinfo"
        ]
      }
    }
  },

  fun: {
    title: "🎭 Fun",
    categories: {
      text_effects: {
        title: "✨ Text Effects",
        commands: [
          "mock",
          "vapor",
          "clap",
          "shrug",
          "rev",
          "echo"
        ]
      },
      random: {
        title: "🎲 Random",
        commands: [
          "q",
          "quote",
          "meme",
          "dog",
          "cat",
          "joke"
        ]
      },
      actions: {
        title: "👊 Actions",
        commands: [
          "slap"
        ]
      },
      spam: {
        title: "📢 Spam",
        commands: [
          "spam",
          "dspam"
        ]
      }
    }
  },

  developer: {
    title: "👨‍💻 Developer",
    categories: {
      execution: {
        title: "💻 Code Execution",
        commands: [
          "eval",
          "exec",
          "term"
        ]
      },
      plugins: {
        title: "🔌 Plugin Management",
        commands: [
          "install"
        ]
      },
      debugging: {
        title: "📄 Debugging",
        commands: [
          "logs",
          "json",
          "status",
          "autolog",
          "errlogs",
          "testerror"
        ]
      },
      system: {
        title: "⚡ System",
        commands: [
          "restart",
          "shutdown",
          "sleep"
        ]
      },
      environment: {
        title: "🌱 Environment Variables",
        commands: [
          "setvar",
          "getvar",
          "delvar"
        ]
      }
    }
  }
};
