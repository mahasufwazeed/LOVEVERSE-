using UnrealBuildTool;

public class LoveVerseUnreal : ModuleRules
{
    public LoveVerseUnreal(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(new string[]
        {
            "Core",
            "CoreUObject",
            "Engine",
            "InputCore",
            "EnhancedInput",
            "HTTP",
            "Json",
            "JsonUtilities",
            "PixelStreaming",
            "Networking",
            "Sockets"
        });
    }
}
