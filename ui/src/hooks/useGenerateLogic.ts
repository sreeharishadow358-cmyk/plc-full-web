import { useMutation } from "@tanstack/react-query";
import { generatePlcLogic } from "../services/plcApi";
import { usePlcStore } from "../store/plcStore";

export const useGenerateLogic = () => {
  const { setProgram, setExplanation, setIsGenerating } = usePlcStore();

  return useMutation({
    mutationFn: async (input: string) => {
      setIsGenerating(true);
      try {
        return await generatePlcLogic(input);
      } finally {
        setIsGenerating(false);
      }
    },
    onSuccess: (data) => {
      if (data.status === 'needs_clarification') {
        setProgram({ title: 'Clarification Needed - No Ladder Generated', rungs: [] }, false);
      } else if (data.program) {
        setProgram(data.program, true);
      }
      setExplanation(data.explanation);
    },
    onError: (error) => {
      console.error("Logic Generation Failed:", error);
    },
  });
};
