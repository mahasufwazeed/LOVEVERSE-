#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "LVTypes.h"
#include "LVInteractionDirector.generated.h"

class ALVAvatarCharacter;
class UParticleSystemComponent;

UCLASS(Blueprintable)
class LOVEVERSEUNREAL_API ALVInteractionDirector : public AActor
{
    GENERATED_BODY()

public:
    ALVInteractionDirector();

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    ALVAvatarCharacter* UserAvatar;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    ALVAvatarCharacter* PartnerAvatar;

    UFUNCTION(BlueprintCallable)
    void PlayCoupleInteraction(ELVCoupleInteraction Interaction);

    UFUNCTION(BlueprintCallable)
    void ResetToIdle();

protected:
    virtual void BeginPlay() override;

private:
    void MoveAvatarsForInteraction(ELVCoupleInteraction Interaction);
};
