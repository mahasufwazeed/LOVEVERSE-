#include "LoveVerseAvatarComponent.h"

#include "LVAvatarCharacter.h"

void ULoveVerseAvatarComponent::ApplyAppearanceToAvatar(const FLVAvatarAppearance& Appearance)
{
    ALVAvatarCharacter* Character = Cast<ALVAvatarCharacter>(GetOwner());
    if (!Character)
    {
        return;
    }

    FLVAvatarConfig LegacyConfig;
    LegacyConfig.SkinColor = Appearance.SkinColor;
    LegacyConfig.HairColor = Appearance.HairColor;
    LegacyConfig.EyeColor = Appearance.EyeColor;
    LegacyConfig.ShirtColor = Appearance.ClothingColor;
    LegacyConfig.HairStyle = Appearance.HairStyle;
    Character->ApplyAvatarConfig(LegacyConfig);
    Character->SetAvatarProportions(Appearance.HeightScale, Appearance.BodyScale);
}
