#pragma once

#include "CoreMinimal.h"
#include "LVAvatarCharacter.h"
#include "LoveVerseCharacter.generated.h"

class ULoveVerseAnimationComponent;
class ULoveVerseAvatarComponent;
class ULoveVerseCustomizationComponent;
class ULoveVerseEmotionComponent;

UCLASS(Blueprintable)
class LOVEVERSEUNREAL_API ALoveVerseCharacter : public ALVAvatarCharacter
{
    GENERATED_BODY()

public:
    ALoveVerseCharacter();

    virtual void Tick(float DeltaSeconds) override;
    virtual void PlayInteractionPose(ELVCoupleInteraction Interaction, bool bIsPartner) override;

    UFUNCTION(BlueprintPure, Category = "LoveVerse|Avatar")
    ULoveVerseAvatarComponent* GetAvatarComponent() const { return AvatarComponent; }

    UFUNCTION(BlueprintPure, Category = "LoveVerse|Animation")
    ULoveVerseAnimationComponent* GetAnimationComponent() const { return AnimationComponent; }

    UFUNCTION(BlueprintPure, Category = "LoveVerse|Customization")
    ULoveVerseCustomizationComponent* GetCustomizationComponent() const { return CustomizationComponent; }

    UFUNCTION(BlueprintPure, Category = "LoveVerse|Emotion")
    ULoveVerseEmotionComponent* GetEmotionComponent() const { return EmotionComponent; }

protected:
    virtual void BeginPlay() override;

private:
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "LoveVerse|Avatar", meta=(AllowPrivateAccess="true"))
    ULoveVerseAvatarComponent* AvatarComponent;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "LoveVerse|Animation", meta=(AllowPrivateAccess="true"))
    ULoveVerseAnimationComponent* AnimationComponent;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "LoveVerse|Customization", meta=(AllowPrivateAccess="true"))
    ULoveVerseCustomizationComponent* CustomizationComponent;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "LoveVerse|Emotion", meta=(AllowPrivateAccess="true"))
    ULoveVerseEmotionComponent* EmotionComponent;

    UFUNCTION()
    void HandleAppearanceChanged(const FLVAvatarAppearance& Appearance);

    UFUNCTION()
    void HandleExpressionChanged(ELVFacialExpression Expression);
};
