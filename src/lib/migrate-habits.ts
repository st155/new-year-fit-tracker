import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_HABIT_TEMPLATES } from "./habit-templates";

export async function migrateExistingHabits(userId: string) {
  try {
    console.log("Starting habit migration for user:", userId);

    // Получаем все существующие привычки без ai_motivation
    const { data: habits, error: fetchError } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", userId)
      .or("ai_motivation.is.null,custom_settings.is.null");

    if (fetchError) {
      console.error("Error fetching habits:", fetchError);
      return { success: false, error: fetchError };
    }

    if (!habits || habits.length === 0) {
      console.log("No habits to migrate");
      return { success: true, migrated: 0 };
    }

    console.log(`Found ${habits.length} habits to migrate`);
    let migratedCount = 0;

    for (const habit of habits) {
      let template = null;
      let updates: any = {};

      // Попытка найти подходящий шаблон по названию
      if (habit.name.toLowerCase().includes("курить") || habit.name.toLowerCase().includes("куря")) {
        template = DEFAULT_HABIT_TEMPLATES.find(t => t.id === "no-smoking");
      } else if (habit.name.toLowerCase().includes("алкоголь") || habit.name.toLowerCase().includes("пить")) {
        template = DEFAULT_HABIT_TEMPLATES.find(t => t.id === "no-alcohol");
      } else if (habit.name.toLowerCase().includes("fasting") || habit.name.toLowerCase().includes("голод")) {
        template = DEFAULT_HABIT_TEMPLATES.find(t => t.id === "intermittent-fasting");
      } else if (habit.name.toLowerCase().includes("сахар") || habit.name.toLowerCase().includes("сладк")) {
        template = DEFAULT_HABIT_TEMPLATES.find(t => t.id === "no-sugar");
      } else if (habit.name.toLowerCase().includes("фастфуд") || habit.name.toLowerCase().includes("fast")) {
        template = DEFAULT_HABIT_TEMPLATES.find(t => t.id === "no-junk-food");
      }

      if (template) {
        // Обновляем на основе шаблона
        updates.ai_motivation = template.ai_motivation;
        updates.icon = template.icon;
        updates.color = template.color;
        
        if (template.custom_settings && !habit.custom_settings) {
          updates.custom_settings = template.custom_settings;
        } else if (template.custom_settings && habit.custom_settings) {
          // Мерджим настройки
          updates.custom_settings = {
            ...(habit.custom_settings as Record<string, any>),
            ...template.custom_settings,
          };
        }
      } else {
        // Базовая AI мотивация для кастомных привычек
        if (!habit.ai_motivation) {
          updates.ai_motivation = {
            milestones: {
              1440: "✨ 1 день пройден! Отличное начало!",
              10080: "🔥 Неделя позади! Продолжай в том же духе!",
              43200: "💪 Целый месяц! Ты молодец!",
              129600: "🏆 3 месяца! Это уже стало привычкой!",
            },
          };
        }
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from("habits")
          .update(updates)
          .eq("id", habit.id);

        if (updateError) {
          console.error(`Error updating habit ${habit.id}:`, updateError);
        } else {
          migratedCount++;
          console.log(`Migrated habit: ${habit.name}`);
        }
      }
    }

    console.log(`Migration complete: ${migratedCount} habits updated`);
    return { success: true, migrated: migratedCount };
  } catch (error) {
    console.error("Migration error:", error);
    return { success: false, error };
  }
}
