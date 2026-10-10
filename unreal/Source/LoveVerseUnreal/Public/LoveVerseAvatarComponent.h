#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "LVTypes.h"
#include "LoveVerseAvatarComponent.generated.h"

UCLASS(ClassGroup=(LoveVerse), meta=(BlueprintSpawnableComponent))
class LOVEVERSEUNREAL_API ULoveVerseAvatarComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "LoveVerse|Avatar")
    void ApplyAppearanceToAvatar(const FLVAvatarAppearance& Appearance);
};
